import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Volume2, VolumeX, Notebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChatMessage from "@/components/alpha/ChatMessage";
import ChatInput from "@/components/alpha/ChatInput";
import PortalRouter from "@/components/portals/PortalRouter";
import { getAlphaResponse, analyzeResult, welcomeBack } from "@/lib/alphaEngine";
import { buildEvidenceReport } from "@/lib/report";
import { speak } from "@/lib/voice";

// ── Local Storage Helpers ──────────────────────────────────────────────
const STORAGE_KEY = "alpha_conversation";
const MEMORY_KEY = "alpha_memory";

function loadMessages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveMessages(msgs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
}

function loadMemory() {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{"records":[],"mistakes":[]}');
  } catch { return { records: [], mistakes: [] }; }
}

function saveMemory(mem) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
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
  const scrollRef = useRef(null);
  const welcomedRef = useRef(false);

  // Load messages from localStorage on mount
  const loadMessagesFromStorage = useCallback(() => {
    const stored = loadMessages();
    if (stored.length === 0) {
      const greeting = makeMsg("alpha",
        "Hi, I'm **Alpha** — your personal learning orchestrator. 🌟\n\nTell me what you're preparing for — **JAMB**, **WAEC** or **NECO** — and a subject or topic. Or just say *\"help me prepare for JAMB\"* and I'll take it from here.\n\nI'll teach you, test you, watch how you do, fix your mistakes, and decide what's next. You just keep moving forward."
      );
      setMessages([greeting]);
      saveMessages([greeting]);
    } else {
      setMessages(stored);
      // Welcome back with AI
      if (!welcomedRef.current && stored.length > 0) {
        welcomedRef.current = true;
        (async () => {
          try {
            const memory = loadMemory();
            const res = await welcomeBack({ memorySummary: JSON.stringify(memory), dueReviews: [] });
            const msg = makeMsg("alpha", res.reply || "Welcome back.", { action: res.action || null });
            setMessages((m) => { const next = [...m, msg]; saveMessages(next); return next; });
          } catch (e) { /* ignore */ }
        })();
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMessagesFromStorage(); }, [loadMessagesFromStorage]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  // ── Send Message ───────────────────────────────────────────────────
  const send = async (text, attachments = []) => {
    const userMsg = makeMsg("user", text, { attachments });
    const afterUser = [...messages, userMsg];
    setMessages(afterUser);
    saveMessages(afterUser);
    setThinking(true);

    try {
      const memory = loadMemory();
      const memorySummary = JSON.stringify(memory);
      const history = afterUser.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await getAlphaResponse({ userMessage: text, history, memorySummary, attachments });
      const alphaMsg = makeMsg("alpha", res.reply || "…", {
        action: res.action || null,
        note_offer: res.note_offer || null,
      });
      setMessages((m) => { const next = [...m, alphaMsg]; saveMessages(next); return next; });
      if (ttsOn) speak(res.reply);
    } catch (e) {
      console.error("Alpha response error:", e);
      const errMsg = makeMsg("alpha", "I hit a small snag just now. Let's try that again — could you rephrase?");
      setMessages((m) => { const next = [...m, errMsg]; saveMessages(next); return next; });
    } finally {
      setThinking(false);
    }
  };

  // ── Handle Portal Action ───────────────────────────────────────────
  const handleAction = async (action) => {
    if (!action || action.type !== "portal") return;
    if (action.mission) {
      setActiveMission({
        id: String(Date.now()),
        goal: action.mission.goal,
        exam: action.exam,
        deadline: action.mission.deadline,
        total_minutes: action.mission.total_minutes,
        steps: action.mission.steps,
        current_step: 0,
        status: "active",
      });
    }
    setActivePortal({
      type: action.portal,
      config: action,
      sessionId: String(Date.now()),
    });
  };

  // ── Portal Complete ────────────────────────────────────────────────
  const handlePortalComplete = async (result) => {
    const cfg = activePortal.config;
    const portalType = activePortal.type;

    // Update memory
    const memory = loadMemory();
    if (!result.learned && !result.aborted && cfg.concept) {
      const existing = memory.records.find((r) => r.concept === cfg.concept);
      if (existing) {
        existing.attempts = (existing.attempts || 0) + 1;
        existing.correct = (existing.correct || 0) + (result.correct || 0);
        existing.last_score = result.score || 0;
        existing.streak = result.score >= 70 ? (existing.streak || 0) + 1 : 0;
      } else {
        memory.records.push({
          concept: cfg.concept,
          attempts: 1,
          correct: result.correct || 0,
          last_score: result.score || 0,
          streak: result.score >= 70 ? 1 : 0,
          status: result.score >= 80 ? "mastered" : "learning",
        });
      }
      if (result.mistakes) {
        result.mistakes.forEach((m) => {
          memory.mistakes.push({ concept: cfg.concept, pattern: "concept_confusion", date: new Date().toISOString() });
        });
      }
      saveMemory(memory);
    }

    const evidence = buildEvidenceReport(cfg, result, null);

    let missionState = activeMission;
    if (activeMission) {
      const step = activeMission.steps && activeMission.steps[activeMission.current_step];
      if (step && step.concept === cfg.concept) {
        const nextStep = activeMission.current_step + 1;
        const done = nextStep >= (activeMission.steps?.length || 0);
        missionState = done ? null : { ...activeMission, current_step: nextStep };
        setActiveMission(missionState);
      }
    }

    setActivePortal(null);
    setThinking(true);
    try {
      const memorySummary = JSON.stringify(loadMemory());
      const res = await analyzeResult({ portalType, config: cfg, result, evidence, memorySummary, mission: missionState });
      const msg = makeMsg("alpha", res.reply || "Nice work. What's next?", {
        action: res.action || null,
        report: evidence,
      });
      setMessages((m) => { const next = [...m, msg]; saveMessages(next); return next; });
      if (ttsOn) speak(res.reply);
    } catch (e) {
      console.error("Post-portal analysis error:", e);
    } finally {
      setThinking(false);
    }
  };

  const handlePortalExit = () => { setActivePortal(null); };

  const handleSaveNote = (note) => {
    try {
      const notes = JSON.parse(localStorage.getItem("alpha_notes") || "[]");
      notes.push({ id: String(Date.now()), ...note, createdAt: new Date().toISOString() });
      localStorage.setItem("alpha_notes", JSON.stringify(notes));
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold leading-none">Alpha Study</div>
            <div className="text-xs text-muted-foreground">Your learning orchestrator</div>
          </div>
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
            <motion.div
              key="portal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0"
            >
              <PortalRouter portal={activePortal} onComplete={handlePortalComplete} onExit={handlePortalExit} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col">
              <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
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
              <ChatInput onSend={send} thinking={thinking} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
