import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Lightbulb, AlertTriangle, Brain, Target, CheckCircle2, XCircle, ArrowRight, Scale,
} from "lucide-react";
import PortalShell from "./PortalShell";
import { teachLesson } from "@/lib/alphaEngine";
import { Button } from "@/components/ui/button";

const KIND = {
  analogy: { icon: Lightbulb, color: "amber", label: "Think of it like this" },
  explanation: { icon: BookOpen, color: "indigo", label: "The real explanation" },
  example: { icon: Target, color: "emerald", label: "Worked example" },
  trap: { icon: AlertTriangle, color: "rose", label: "Common trap" },
  compare: { icon: Scale, color: "violet", label: "Compare" },
  memory: { icon: Brain, color: "violet", label: "Memory hook" },
  exam: { icon: Target, color: "indigo", label: "Exam connection" },
};
const COLORS = {
  amber: "text-amber-600 bg-amber-50",
  indigo: "text-indigo-600 bg-indigo-50",
  emerald: "text-emerald-600 bg-emerald-50",
  rose: "text-rose-600 bg-rose-50",
  violet: "text-violet-600 bg-violet-50",
};

function TeachCard({ kind, heading, body }) {
  const meta = KIND[kind] || KIND.explanation;
  const Icon = meta.icon;
  return (
    <div>
      <div className="inline-flex items-center gap-2 text-sm font-semibold mb-2">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${COLORS[meta.color]}`}>
          <Icon className="w-4 h-4" />
        </span>
        {heading || meta.label}
      </div>
      <div className="text-sm leading-relaxed pl-9 whitespace-pre-line">{body}</div>
    </div>
  );
}

export default function LessonPortal({ config, onComplete, onExit }) {
  const [lesson, setLesson] = useState(null);
  const [err, setErr] = useState(null);
  const [step, setStep] = useState(0);
  const [checkAnswer, setCheckAnswer] = useState(null);
  const [checkRevealed, setCheckRevealed] = useState(false);

  useEffect(() => {
    teachLesson(config)
      .then(setLesson)
      .catch(() => setErr("Could not load this lesson. Let's head back to Alpha."));
  }, []);

  const finish = () => onComplete({ total: 0, correct: 0, score: 0, mistakes: [], learned: true });

  if (err) {
    return (
      <PortalShell title="Lesson" subtitle={config.concept} icon={BookOpen} accent="indigo" onExit={onExit}>
        <div className="p-6 text-center text-muted-foreground">
          {err}
          <div className="mt-4"><Button onClick={finish}>Back to Alpha</Button></div>
        </div>
      </PortalShell>
    );
  }
  if (!lesson) {
    return (
      <PortalShell title="Lesson" subtitle={config.concept} icon={BookOpen} accent="indigo" onExit={onExit}>
        <div className="text-center text-muted-foreground py-10">Alpha is preparing your lesson…</div>
      </PortalShell>
    );
  }

  const cards = [];
  if (lesson.analogy) cards.push({ kind: "analogy", body: lesson.analogy });
  if (lesson.explanation) cards.push({ kind: "explanation", body: lesson.explanation });
  if (lesson.key_points && lesson.key_points.length)
    cards.push({ kind: "explanation", heading: "Key points", body: lesson.key_points.map((p) => `• ${p}`).join("\n") });
  if (lesson.example) cards.push({ kind: "example", body: lesson.example });
  if (lesson.check_question && lesson.check_options)
    cards.push({
      kind: "check",
      question: lesson.check_question,
      options: lesson.check_options,
      correct_index: lesson.check_correct_index,
      explanation: lesson.check_explanation,
    });
  if (lesson.compare) cards.push({ kind: "compare", body: lesson.compare });
  if (lesson.common_mistakes && lesson.common_mistakes.length)
    cards.push({ kind: "trap", heading: "Watch out for", body: lesson.common_mistakes.map((p) => `• ${p}`).join("\n") });
  if (lesson.memory_hook) cards.push({ kind: "memory", body: lesson.memory_hook });
  if (lesson.exam_tip) cards.push({ kind: "exam", body: lesson.exam_tip });

  const card = cards[step];
  const isCheck = card && card.kind === "check";
  const isLast = step >= cards.length - 1;

  const next = () => {
    if (isLast) { finish(); return; }
    setStep((s) => s + 1);
    setCheckAnswer(null);
    setCheckRevealed(false);
  };

  return (
    <PortalShell
      title={lesson.title || "Lesson"}
      subtitle={config.concept}
      icon={BookOpen}
      accent="indigo"
      onExit={onExit}
      footer={
        <div className="max-w-2xl mx-auto flex gap-2">
          <Button variant="ghost" onClick={onExit}>Leave lesson</Button>
          {(!isCheck || checkRevealed) && (
            <Button onClick={next} className="flex-1">
              {isLast ? "Done — what's next?" : "Continue"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      }
    >
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="flex gap-1 mb-5">
          {cards.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-indigo-500" : "bg-muted"}`} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {isCheck ? (
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-semibold mb-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600">
                    <Target className="w-4 h-4" />
                  </span>
                  Quick check
                </div>
                <div className="text-base font-medium mb-4">{card.question}</div>
                <div className="space-y-2">
                  {card.options.map((opt, i) => {
                    const isCorrect = i === card.correct_index;
                    const chosen = checkAnswer === i;
                    return (
                      <button
                        key={i}
                        disabled={checkRevealed}
                        onClick={() => setCheckAnswer(i)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                          checkRevealed && isCorrect
                            ? "border-emerald-500 bg-emerald-50"
                            : checkRevealed && chosen && !isCorrect
                            ? "border-rose-500 bg-rose-50"
                            : chosen
                            ? "border-indigo-500 bg-indigo-50"
                            : "hover:border-indigo-300 bg-card"
                        }`}
                      >
                        <span className="font-mono mr-2 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                        {checkRevealed && isCorrect && <CheckCircle2 className="inline w-4 h-4 ml-2 text-emerald-600" />}
                        {checkRevealed && chosen && !isCorrect && <XCircle className="inline w-4 h-4 ml-2 text-rose-600" />}
                      </button>
                    );
                  })}
                </div>
                {!checkRevealed && (
                  <Button className="mt-4" disabled={checkAnswer === null} onClick={() => setCheckRevealed(true)}>
                    Check answer
                  </Button>
                )}
                {checkRevealed && <div className="mt-3 text-sm text-muted-foreground">{card.explanation}</div>}
              </div>
            ) : (
              <TeachCard kind={card.kind} heading={card.heading} body={card.body} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PortalShell>
  );
}