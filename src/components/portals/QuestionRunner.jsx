import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronRight, Flag, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { fetchQuestions } from "@/lib/questions";
import { scoreAttempt } from "@/lib/assessment";

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

export default function QuestionRunner({ config, onComplete }) {
  const { concept, subject, exam, question_count = 8, duration_minutes, difficulty } = config;
  const timed = !!duration_minutes;
  const [questions, setQuestions] = useState(null);
  const [phase, setPhase] = useState("ready");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const answersRef = useRef({});
  const [timeLeft, setTimeLeft] = useState((duration_minutes || 0) * 60);
  const [error, setError] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const doneRef = useRef(false);
  const qEnteredAt = useRef(0);
  const perTimes = useRef([]);
  const startedAt = useRef(0);

  const submit = useCallback(
    (ans) => {
      if (doneRef.current || !questions) return;
      doneRef.current = true;
      if (qEnteredAt.current)
        perTimes.current[idx] = (perTimes.current[idx] || 0) + (Date.now() - qEnteredAt.current) / 1000;
      const arr = questions.map((_, i) => ans[i]);
      const result = scoreAttempt(questions, arr);
      result.perQuestionTimes = perTimes.current.slice(0, questions.length);
      result.totalTime = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
      result.startedAt = startedAt.current ? new Date(startedAt.current).toISOString() : null;
      result.question_ids = questions.map((q) => q.id).filter(Boolean);
      result.confidence = confidence;
      onComplete(result);
    },
    [questions, onComplete, idx]
  );

  useEffect(() => {
    (async () => {
      try {
        const qs = await fetchQuestions({ concept, difficulty, count: question_count, exam, subject });
        if (!qs.length) {
          setError(`No questions are available for "${concept}" yet. Ask Alpha to teach it first, or try another topic.`);
          return;
        }
        setQuestions(qs);
      } catch (e) {
        setError("Could not load questions right now. Returning to Alpha.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!questions || phase !== "running" || !timed) return;
    if (timeLeft <= 0) { submit(answersRef.current); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, questions, phase, timed, submit]);

  const start = () => {
    setPhase("running");
    startedAt.current = Date.now();
    qEnteredAt.current = Date.now();
  };

  const goTo = (i) => {
    if (qEnteredAt.current)
      perTimes.current[idx] = (perTimes.current[idx] || 0) + (Date.now() - qEnteredAt.current) / 1000;
    setIdx(i);
    qEnteredAt.current = Date.now();
  };

  const choose = (i) => {
    setAnswers((a) => {
      const next = { ...a, [idx]: i };
      answersRef.current = next;
      return next;
    });
  };

  if (error) {
    return (
      <div className="p-6 text-center text-muted-foreground max-w-md mx-auto">
        {error}
        <div className="mt-4">
          <Button onClick={() => onComplete({ total: 0, correct: 0, score: 0, mistakes: [], unanswered: 0, aborted: true })}>
            Back to Alpha
          </Button>
        </div>
      </div>
    );
  }
  if (!questions) return <div className="p-10 text-center text-muted-foreground">Alpha is preparing your questions…</div>;

  if (phase === "ready") {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="text-sm text-muted-foreground mb-1">{config.title || "Assessment"}</div>
        <div className="text-xl font-semibold mb-5">{concept}</div>
        <div className="flex justify-center gap-3 mb-6">
          <Stat label="Questions" value={questions.length} />
          {timed ? <Stat label="Time limit" value={`${duration_minutes} min`} /> : <Stat label="Mode" value="Untimed" />}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {timed
            ? "The timer starts when you press Start. When time is up the assessment ends automatically — no extensions, no hints."
            : "Take your time. Alpha will still grade every answer honestly."}
        </p>
        {timed && (
          <div className="mb-6">
            <div className="text-sm font-medium mb-2">How confident are you? (1–5)</div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setConfidence(n)}
                  className={`w-10 h-10 rounded-full border text-sm font-semibold transition ${
                    confidence === n ? "bg-indigo-600 text-white border-indigo-600" : "bg-card hover:border-indigo-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">This won't affect your score — it helps Alpha understand you.</div>
          </div>
        )}
        <Button size="lg" onClick={start} disabled={timed && confidence === null} className="w-full">
          <Play className="w-4 h-4 mr-2" /> Start
        </Button>
      </div>
    );
  }

  const q = questions[idx];
  const mm = String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, timeLeft) % 60).padStart(2, "0");
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <Badge variant="secondary">{answeredCount}/{questions.length} answered</Badge>
        {timed && (
          <div className={`flex items-center gap-1 font-mono text-sm ${timeLeft < 60 ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
            <Clock className="w-4 h-4" /> {mm}:{ss}
          </div>
        )}
      </div>
      <Progress value={(answeredCount / questions.length) * 100} className="mb-6 h-1.5" />
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <div className="text-xs text-muted-foreground mb-1 capitalize">
            Question {idx + 1} · {q.provenance ? q.provenance.replace(/_/g, " ") : "practice"}
          </div>
          {q.source_label && <div className="text-[10px] text-amber-600 mb-2">⚠ {q.source_label}</div>}
          <div className="text-base font-medium mb-4">{q.question_text}</div>
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => choose(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                  answers[idx] === i ? "border-indigo-500 bg-indigo-50" : "hover:border-indigo-300 bg-card"
                }`}
              >
                <span className="font-mono mr-2 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center justify-between mt-6">
        <Button variant="ghost" disabled={idx === 0} onClick={() => goTo(idx - 1)}>Back</Button>
        {idx < questions.length - 1 ? (
          <Button onClick={() => goTo(idx + 1)}>Next <ChevronRight className="w-4 h-4" /></Button>
        ) : (
          <Button onClick={() => submit(answersRef.current)}><Flag className="w-4 h-4 mr-1" /> Submit</Button>
        )}
      </div>
    </div>
  );
}