const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

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
import { fetchMemory, buildMemorySummary, recordAttempt, recordMistakes, markLearningStarted, saveNote, getDueReviews } from "@/lib/learning";
import { buildEvidenceReport } from "@/lib/report";
import { speak } from "@/lib/voice";

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

  const loadMessages = useCallback(async () => {
    try {
      const list = await db.entities.ConversationMessage.list("created_date", 200);
      if (list.length === 0) {
        const greeting = await db.entities.ConversationMessage.create({
          role: "alpha",
          content:
            "Hi, I'm **Alpha** — your personal learning orchestrator. 🌟\n\nTell me what you're preparing for — **JAMB**, **WAEC** or **NECO** — and a subject or topic. Or just say *\"help me prepare for JAMB\"* and I'll take it from here.\n\nI'll teach you, test you, watch how you do, fix your mistakes, and decide what's next. You just keep moving forward.",
          kind: "message",
        });
        setMessages([greeting]);
      } else {
        setMessages(list);
        if (!welcomedRef.current) {
          welcomedRef.current = true;
          (async () => {
            try {
              const memory = await fetchMemory();
              const due = await getDueReviews();
              const memorySummary = buildMemorySummary(memory, due);
              const res = await welcomeBack({ memorySummary, dueReviews: due });
              const msg = await db.entities.ConversationMessage.create({
                role: "alpha",
                content: res.reply || "Welcome back.",
                action: res.action || null,
                kind: "message",
              });
              setMessages((m) => [...m, msg]);
              if (res.action && res.action.mission) {
                const mission = await db.entities.Mission.create({
                  goal: res.action.mission.goal,
                  exam: res.action.exam,
                  deadline: res.action.mission.deadline,
                  total_minutes: res.action.mission.total_minutes,
                  steps: res.action.mission.steps,
                  current_step: 0,
                  status: "active",
                });
                setActiveMission(mission);
              }
            } catch (e) {}
          })();
        }
      }
    } catch (e) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { getDueReviews().then(setDueReviews).catch(() => {}); }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const send = async (text, attachments = []) => {
    const userMsg = await db.entities.ConversationMessage.create({
      role: "user",
      content: text,
      attachments,
    });
    setMessages((m) => [...m, userMsg]);
    setThinking(true);
    try {
      const memory = await fetchMemory();
      const memorySummary = buildMemorySummary(memory, dueReviews);
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await getAlphaResponse({ userMessage: text, history, memorySummary, attachments });
      const alphaMsg = await db.entities.ConversationMessage.create({
        role: "alpha",
        content: res.reply || "…",
        action: res.action || null,
        note_offer: res.note_offer || null,
        kind: "message",
      });
      setMessages((m) => [...m, alphaMsg]);
      if (ttsOn) speak(res.reply);
    } catch (e) {
      const errMsg = await db.entities.ConversationMessage.create({
        role: "alpha",
        content: "I hit a small snag just now. Let's try that again — could you rephrase?",
      });
      setMessages((m) => [...m, errMsg]);
    } finally {
      setThinking(false);
    }
  };

  const handleAction = async (action) => {
    if (!action || action.type !== "portal") return;
    if (action.mission) {
      try {
        const mission = await db.entities.Mission.create({
          goal: action.mission.goal,
          exam: action.exam,
          deadline: action.mission.deadline,
          total_minutes: action.mission.total_minutes,
          steps: action.mission.steps,
          current_step: 0,
          status: "active",
        });
        setActiveMission(mission);
      } catch (e) {}
    }
    const session = await db.entities.PortalSession.create({
      portal_type: action.portal,
      concept: action.concept,
      config: action,
      status: "active",
    });
    setActivePortal({ type: action.portal, config: action, sessionId: session.id });
  };

  const handlePortalComplete = async (result) => {
    const cfg = activePortal.config;
    const portalType = activePortal.type;
    const sessionId = activePortal.sessionId;

    const memory = await fetchMemory();
    const prevRecord = memory.records.find((r) => r.concept === cfg.concept);

    if (result.learned) {
      try { await markLearningStarted(cfg); } catch (e) {}
    } else if (!result.aborted && cfg.concept) {
      try {
        await recordAttempt(cfg, result);
        await recordMistakes(cfg, result.mistakes || [], portalType);
      } catch (e) {}
    }

    const evidence = buildEvidenceReport(cfg, result, prevRecord);
    try { await db.entities.PortalSession.update(sessionId, { status: "completed", result }); } catch (e) {}

    let missionState = activeMission;
    if (activeMission) {
      const step = activeMission.steps && activeMission.steps[activeMission.current_step];
      if (step && step.concept === cfg.concept) {
        const nextStep = activeMission.current_step + 1;
        const done = nextStep >= (activeMission.steps?.length || 0);
        try { await db.entities.Mission.update(activeMission.id, { current_step: nextStep, status: done ? "completed" : "active" }); } catch (e) {}
        missionState = done ? null : { ...activeMission, current_step: nextStep };
        setActiveMission(missionState);
      }
    }

    setActivePortal(null);
    setThinking(true);
    try {
      const memorySummary = buildMemorySummary(await fetchMemory(), []);
      const res = await analyzeResult({ portalType, config: cfg, result, evidence, memorySummary, mission: missionState });
      const msg = await db.entities.ConversationMessage.create({
        role: "alpha",
        content: res.reply || "Nice work. What's next?",
        action: res.action || null,
        report: evidence,
        kind: "message",
      });
      setMessages((m) => [...m, msg]);
      if (ttsOn) speak(res.reply);
    } catch (e) {
    } finally {
      setThinking(false);
    }
  };

  const handlePortalExit = async () => {
    if (activePortal?.sessionId) {
      try { await db.entities.PortalSession.update(activePortal.sessionId, { status: "abandoned" }); } catch (e) {}
    }
    setActivePortal(null);
  };

  const handleSaveNote = async (note) => {
    try {
      await saveNote(note);
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