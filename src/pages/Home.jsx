import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Volume2, VolumeX, Notebook, Menu, History, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import ChatMessage from "@/components/alpha/ChatMessage";
import ChatInput from "@/components/alpha/ChatInput";
import PortalRouter from "@/components/portals/PortalRouter";
import { getAlphaResponse, analyzeResult, welcomeBack } from "@/lib/alphaEngine";
import { buildEvidenceReport } from "@/lib/report";
import { speak } from "@/lib/voice";
import { db } from "@/api/alphaClient";

const API_BASE = import.meta.env.VITE_API_URL || '';
const HAS_API = !!API_BASE;

// ── Local Storage Helpers (fallback when API unavailable) ──────────────
const STORAGE_KEY = "alpha_conversation";

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveLocal(msgs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
}

let _msgId = Date.now();
function makeMsg(role, content, extra = {}) {
  return { id: String(++_msgId), role, content, createdAt: new Date().toISOString(), ...extra };
}

// ── Alpha Thinking Animation ───────────────────────────────────────────
function AlphaThinking() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// ── Main Home Component ────────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [activePortal, setActivePortal] = useState(null);
  const [ttsOn, setTtsOn] = useState(false);
  const [dueReviews, setDueReviews] = useState([]);
  const [activeMission, setActiveMission] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef(null);
  const welcomedRef = useRef(false);

  // ── Load Messages ────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      let list = [];
      if (HAS_API) {
        try {
          list = await db.entities.ConversationMessage.list("created_date", 200);
        } catch {
          list = loadLocal();
        }
      } else {
        list = loadLocal();
      }

      if (list.length === 0) {
        const greeting = makeMsg("alpha",
          "Hi, I'm **Alpha** — your personal learning orchestrator. 🌟\n\nTell me what you're preparing for — **JAMB**, **WAEC** or **NECO** — and a subject or topic. Or just say *\"help me prepare for JAMB\"* and I'll take it from here.\n\nI'll teach you, test you, watch how you do, fix your mistakes, and decide what's next. You just keep moving forward."
        );
        if (HAS_API) {
          try { await db.entities.ConversationMessage.create({ role: "alpha", content: greeting.content, kind: "message" }); } catch {}
        }
        setMessages([greeting]);
        saveLocal([greeting]);
      } else {
        setMessages(list);
        saveLocal(list);
        // Welcome back
        if (!welcomedRef.current && list.length > 0) {
          welcomedRef.current = true;
          (async () => {
            try {
              const memory = JSON.parse(localStorage.getItem("alpha_memory") || '{"records":[],"mistakes":[]}');
              const res = await welcomeBack({ memorySummary: JSON.stringify(memory), dueReviews: [] });
              let wbAction = null;
              if (res.action && res.action !== 'null') {
                const cfg = res.action_config || {};
                const fb = cfg.concept || cfg.subject || 'General';
                wbAction = typeof res.action === 'object' ? res.action : { ...cfg, type: 'portal', portal: res.action, concept: fb, subject: cfg.subject || fb, exam: cfg.exam || 'WAEC', question_count: cfg.count || 8, title: cfg.title || `${String(res.action).replace(/_/g,' ')} — ${fb}` };
              }
              const msg = makeMsg("alpha", res.reply || "Welcome back.", { action: wbAction, report: res.report || null });
              if (HAS_API) {
                try { await db.entities.ConversationMessage.create({ role: "alpha", content: msg.content, action: msg.action, kind: "message" }); } catch {}
              }
              setMessages((m) => { const next = [...m, msg]; saveLocal(next); return next; });
            } catch (e) { /* ignore */ }
          })();
        }
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
      setMessages([makeMsg("alpha", "Welcome to Alpha Study! Tell me what you'd like to learn.")]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  // ── Send Message ───────────────────────────────────────────────
  const send = async (text, attachments = []) => {
    const userMsg = makeMsg("user", text, { attachments });
    const afterUser = [...messages, userMsg];
    setMessages(afterUser);
    saveLocal(afterUser);

    // Persist to API
    if (HAS_API) {
      try { await db.entities.ConversationMessage.create({ role: "user", content: text, attachments, kind: "message" }); } catch {}
    }

    setThinking(true);
    try {
      const memory = JSON.parse(localStorage.getItem("alpha_memory") || '{"records":[],"mistakes":[]}');
      const memorySummary = JSON.stringify(memory);
      const history = afterUser.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await getAlphaResponse({ userMessage: text, history, memorySummary, attachments });
      // Map AI action+config to portal ActionCard shape
      let portalAction = null;
      if (res.action && res.action !== 'null') {
        if (typeof res.action === 'object' && res.action.type === 'portal') {
          portalAction = res.action;
        } else if (typeof res.action === 'string') {
          const cfg = res.action_config || {};
          const fallbackConcept = cfg.concept || cfg.subject || cfg.topic || (cfg.exam ? `${cfg.exam} ${cfg.subject || 'General'}` : null) || 'English';
          portalAction = {
            ...cfg,
            type: 'portal',
            portal: res.action,
            concept: fallbackConcept,
            subject: cfg.subject || fallbackConcept,
            exam: cfg.exam || 'WAEC',
            question_count: cfg.count || cfg.question_count || (res.action === 'exam' ? 40 : res.action === 'diagnostic' ? 10 : 8),
            duration_minutes: cfg.duration ? Math.round(cfg.duration / 60) : (cfg.duration_minutes || (res.action === 'exam' ? 60 : res.action === 'quiz' ? 15 : undefined)),
            difficulty: cfg.difficulty || 'intermediate',
            pattern: cfg.pattern,
            title: cfg.title || `${res.action.replace(/_/g, ' ')} — ${fallbackConcept}`,
            cta: cfg.cta,
            assessmentMode: cfg.assessmentMode || res.action,
          };
        }
      }
      const noteOffer = res.note_offer ? { content: res.reply, title: res.action_config?.concept || 'Alpha note', concept: res.action_config?.concept } : null;
      const alphaMsg = makeMsg("alpha", res.reply || "…", {
        action: portalAction,
        action_config: res.action_config || null,
        note_offer: noteOffer,
        report: res.report || null,
      });
      if (HAS_API) {
        try { await db.entities.ConversationMessage.create({ role: "alpha", content: alphaMsg.content, action: alphaMsg.action, note_offer: alphaMsg.note_offer, kind: "message" }); } catch {}
      }
      setMessages((m) => { const next = [...m, alphaMsg]; saveLocal(next); return next; });
      if (ttsOn) speak(res.reply);
    } catch (e) {
      console.error("Alpha response error:", e);
      const errMsg = makeMsg("alpha", "I hit a snag: " + (e.message || 'Could not reach Alpha AI. Please check your connection and try again.') + " Let's try that again — could you rephrase?");
      setMessages((m) => { const next = [...m, errMsg]; saveLocal(next); return next; });
    } finally {
      setThinking(false);
    }
  };

  // ── Handle Portal Action ────────────────────────────────────────
  const handleAction = async (action) => {
    if (!action || action.type !== "portal") return;

    let missionState = activeMission;
    if (action.mission) {
      missionState = {
        id: String(Date.now()),
        goal: action.mission.goal,
        exam: action.exam,
        deadline: action.mission.deadline,
        total_minutes: action.mission.total_minutes,
        steps: action.mission.steps,
        current_step: 0,
        status: "active",
      };
      if (HAS_API) {
        try {
          const created = await db.entities.Mission.create({
            goal: missionState.goal, exam: missionState.exam, deadline: missionState.deadline,
            total_minutes: missionState.total_minutes, steps: missionState.steps,
            current_step: 0, status: "active",
          });
          missionState.id = created.id;
        } catch {}
      }
      setActiveMission(missionState);
    }

    let sessionId = String(Date.now());
    if (HAS_API) {
      try {
        const session = await db.entities.PortalSession.create({
          portal_type: action.portal, concept: action.concept, config: action, status: "active",
        });
        sessionId = session.id;
      } catch {}
    }

    setActivePortal({ type: action.portal, config: action, sessionId });
  };

  // ── Portal Complete ─────────────────────────────────────────────
  const handlePortalComplete = async (result) => {
    const cfg = activePortal.config;
    const portalType = activePortal.type;

    // Update memory
    const memory = JSON.parse(localStorage.getItem("alpha_memory") || '{"records":[],"mistakes":[]}');
    if (!result.learned && !result.aborted && cfg.concept) {
      const existing = memory.records.find((r) => r.concept === cfg.concept);
      if (existing) {
        existing.attempts = (existing.attempts || 0) + 1;
        existing.correct = (existing.correct || 0) + (result.correct || 0);
        existing.last_score = result.score || 0;
        existing.streak = result.score >= 70 ? (existing.streak || 0) + 1 : 0;
      } else {
        memory.records.push({
          concept: cfg.concept, attempts: 1, correct: result.correct || 0,
          last_score: result.score || 0, streak: result.score >= 70 ? 1 : 0,
          status: result.score >= 80 ? "mastered" : "learning",
        });
      }
      if (result.mistakes) {
        result.mistakes.forEach((m) => {
          memory.mistakes.push({ concept: cfg.concept, pattern: "concept_confusion", date: new Date().toISOString() });
        });
      }
      localStorage.setItem("alpha_memory", JSON.stringify(memory));

      // Persist to API
      if (HAS_API) {
        try {
          const existing = await db.entities.LearningRecord.filter({ concept: cfg.concept }, "-updated_date", 1);
          if (existing.length > 0) {
            await db.entities.LearningRecord.update(existing[0].id, {
              attempts: existing[0].attempts + 1,
              correct: (existing[0].correct || 0) + (result.correct || 0),
              last_score: result.score || 0,
              streak: result.score >= 70 ? (existing[0].streak || 0) + 1 : 0,
            });
          } else {
            await db.entities.LearningRecord.create({
              concept: cfg.concept, exam: cfg.exam, subject: cfg.subject,
              status: result.score >= 80 ? "mastered" : "learning",
              attempts: 1, correct: result.correct || 0,
              last_score: result.score || 0, streak: result.score >= 70 ? 1 : 0,
            });
          }
        } catch {}
        // Record mistakes via API
        if (result.mistakes) {
          for (const m of result.mistakes) {
            try {
              await db.entities.Mistake.create({
                concept: cfg.concept, question_text: m.question?.question_text || "",
                student_answer: String(m.student), correct_answer: String(m.correct),
                pattern: "concept_confusion", portal_type: portalType,
              });
            } catch {}
          }
        }
      }
    }

    const evidence = buildEvidenceReport(cfg, result, null);

    // Update portal session
    if (HAS_API) {
      try { await db.entities.PortalSession.update(activePortal.sessionId, { status: "completed", result }); } catch {}
    }

    let missionState = activeMission;
    if (activeMission) {
      const step = activeMission.steps && activeMission.steps[activeMission.current_step];
      if (step && step.concept === cfg.concept) {
        const nextStep = activeMission.current_step + 1;
        const done = nextStep >= (activeMission.steps?.length || 0);
        missionState = done ? null : { ...activeMission, current_step: nextStep };
        setActiveMission(missionState);
        if (HAS_API) {
          try { await db.entities.Mission.update(activeMission.id, { current_step: nextStep, status: done ? "completed" : "active" }); } catch {}
        }
      }
    }

    setActivePortal(null);
    setThinking(true);
    try {
      const memorySummary = JSON.stringify(memory);
      const res = await analyzeResult({ portalType, config: cfg, result, evidence, memorySummary, mission: missionState });
      const acfg = res.action_config || {};
      let nextAction = null;
      if (res.action && res.action !== 'null') {
        const fb2 = acfg.concept || acfg.subject || cfg.concept || 'General';
        nextAction = typeof res.action === 'object' ? res.action : { ...acfg, type: 'portal', portal: res.action, concept: fb2, subject: acfg.subject || fb2, exam: acfg.exam || cfg.exam || 'WAEC', question_count: acfg.count || 8, title: acfg.title || `${String(res.action).replace(/_/g,' ')} — ${fb2}` };
      }
      const note2 = res.note_offer ? { content: res.reply, title: acfg.concept || cfg.concept, concept: cfg.concept } : null;
      const msg = makeMsg("alpha", res.reply || "Nice work. What's next?", {
        action: nextAction, note_offer: note2, report: evidence,
      });
      if (HAS_API) {
        try { await db.entities.ConversationMessage.create({ role: "alpha", content: msg.content, action: msg.action, report: evidence, kind: "message" }); } catch {}
      }
      setMessages((m) => { const next = [...m, msg]; saveLocal(next); return next; });
      if (ttsOn) speak(res.reply);
    } catch (e) {
      console.error("Post-portal analysis error:", e);
    } finally {
      setThinking(false);
    }
  };

  const handlePortalExit = async () => {
    if (HAS_API && activePortal?.sessionId) {
      try { await db.entities.PortalSession.update(activePortal.sessionId, { status: "abandoned" }); } catch {}
    }
    setActivePortal(null);
  };

  const handleSaveNote = async (note) => {
    const noteObj = typeof note === 'string' ? { title: 'Alpha note', content: note, concept: 'General' } : note;
    try {
      const notes = JSON.parse(localStorage.getItem("alpha_notes") || "[]");
      notes.push({ id: String(Date.now()), title: noteObj.title || 'Note', content: noteObj.content || String(noteObj), concept: noteObj.concept || 'General', createdAt: new Date().toISOString() });
      localStorage.setItem("alpha_notes", JSON.stringify(notes));
    } catch {}
    if (HAS_API) {
      try { await db.entities.Note.create({ title: noteObj.title || 'Alpha note', content: noteObj.content || String(noteObj), concept: noteObj.concept || 'General' }); } catch {}
    }
  };

  const handleNewChat = () => {
    if (confirm('Start a new chat? Current conversation will be kept in history.')) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      setMessages([makeMsg("alpha", "Hi, I'm **Alpha** — your personal learning orchestrator. 🌟\n\nTell me what you're preparing for — **JAMB**, **WAEC** or **NECO** — and a subject or topic. Or just say *\"help me prepare for JAMB\"* and I'll take it from here.")]);
      setHistoryOpen(false);
    }
  };
  const handleClearHistory = () => {
    if (confirm('Clear all history? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('alpha_memory');
      setMessages([]);
      setHistoryOpen(false);
      loadMessages();
    }
  };

  return (
    <div className="h-[100dvh] h-screen flex flex-col bg-background overflow-hidden">
      <header className="flex items-center justify-between px-2 sm:px-4 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-10 gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setHistoryOpen(true)} title="History">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 hidden xs:block sm:block">
            <div className="font-semibold leading-none text-sm sm:text-base truncate">Alpha Study</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground truncate">Your learning orchestrator</div>
          </div>
          <div className="xs:hidden font-semibold text-sm truncate sm:hidden">Alpha</div>
        </div>
        <div className="flex items-center gap-1">
          {activeMission && activeMission.steps && (
            <Badge variant="outline" className="text-indigo-600 border-indigo-200">
              Mission · {Math.min((activeMission.current_step || 0) + 1, activeMission.steps.length)}/{activeMission.steps.length}
            </Badge>
          )}
          {dueReviews.length > 0 && <Badge variant="secondary">{dueReviews.length} due for review</Badge>}
          <Button variant="ghost" size="icon" onClick={() => setTtsOn((v) => !v)} title="Toggle Alpha's voice">
            {ttsOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Link to="/notes">
            <Button variant="ghost" size="icon" title="My notes">
              <Notebook className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activePortal ? (
            <motion.div key="portal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 overflow-y-auto">
              <PortalRouter portal={activePortal} onComplete={handlePortalComplete} onExit={handlePortalExit} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
              <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
                <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
                  {loading ? (
                    <div className="text-center text-muted-foreground">Loading…</div>
                  ) : (
                    messages.map((m) => (
                      <ChatMessage key={m.id} message={m} onAction={handleAction} onSaveNote={handleSaveNote} />
                    ))
                  )}
                  {thinking && <AlphaThinking />}
                </div>
              </div>
              <div className="shrink-0 border-t bg-background p-2 sm:p-0 pb-[env(safe-area-inset-bottom)]">
                <ChatInput onSend={send} thinking={thinking} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-[320px] sm:max-w-sm p-0 flex flex-col">
          <SheetHeader className="p-4 border-b text-left shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base"><History className="w-4 h-4" /> History</SheetTitle>
            <SheetDescription className="text-xs">Your conversations and notes</SheetDescription>
          </SheetHeader>
          <div className="flex gap-2 p-3 border-b">
            <Button size="sm" className="flex-1" onClick={handleNewChat}><Plus className="w-4 h-4 mr-1" /> New chat</Button>
            <Button size="sm" variant="outline" onClick={handleClearHistory} title="Clear history"><Trash2 className="w-4 h-4" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {messages.length === 0 ? <div className="text-sm text-muted-foreground p-4 text-center">No history yet</div> : messages.slice(-30).reverse().map((m) => (
              <div key={m.id} className="rounded-lg border p-3 text-sm hover:bg-muted/50 cursor-pointer" onClick={() => setHistoryOpen(false)}>
                <div className="text-xs text-muted-foreground mb-1">{m.role === 'user' ? 'You' : 'Alpha'} · {new Date(m.createdAt).toLocaleTimeString()}</div>
                <div className="line-clamp-2 text-xs leading-relaxed">{typeof m.content === 'string' ? m.content.slice(0, 120) : JSON.stringify(m.content).slice(0, 120)}</div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t">
            <Link to="/notes" onClick={() => setHistoryOpen(false)} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"><Notebook className="w-4 h-4" /> View all notes</Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
