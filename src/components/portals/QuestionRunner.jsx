import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronRight, Flag, Play, Mic, MicOff, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { fetchQuestions } from "@/lib/questions";
import { scoreAttempt } from "@/lib/assessment";
import { shouldAskReasoning } from "@/lib/reasoning";
import { getRecognition } from "@/lib/voice";

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

// ============================================================================
// VOICE INPUT COMPONENT
// ============================================================================

function VoiceReasoning({ onTranscript, disabled }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if speech recognition is available
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    setInterim("");

    const recognition = getRecognition(
      (result) => {
        setTranscript(prev => prev ? `${prev} ${result}` : result);
        setInterim("");
        setListening(false);
      },
      () => {
        setListening(false);
      }
    );

    if (!recognition) {
      setError("Speech recognition is not supported in this browser.");
      setSupported(false);
      return;
    }

    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interimTranscript += e.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript);
      }
      setInterim(interimTranscript);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  const submit = useCallback(() => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
    }
  }, [transcript, onTranscript]);

  if (!supported) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">Voice input is not available in this browser.</p>
        <p className="text-xs text-muted-foreground">Type your reasoning below instead.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Voice button */}
      <div className="flex items-center gap-3">
        <button
          onClick={listening ? stopListening : startListening}
          disabled={disabled}
          className={`flex items-center justify-center w-14 h-14 rounded-full transition-all ${
            listening
              ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
              : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
          }`}
          title={listening ? "Stop recording" : "Start speaking"}
        >
          {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <div className="flex-1">
          {listening ? (
            <div className="text-sm text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
              Listening...
              {interim && <span className="block text-foreground mt-1 italic">{interim}</span>}
            </div>
          ) : transcript ? (
            <div className="text-sm text-foreground">{transcript}</div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Tap the mic and speak your reasoning
            </div>
          )}
        </div>
      </div>

      {/* Transcript area */}
      {(transcript || interim) && (
        <div className="bg-muted/50 rounded-xl p-3">
          <div className="text-xs text-muted-foreground mb-1">Your reasoning:</div>
          <div className="text-sm">
            {transcript}
            {interim && <span className="text-muted-foreground italic">{interim}</span>}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {transcript && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="w-3 h-3 mr-1" /> Re-record
          </Button>
        )}
        <Button
          size="sm"
          onClick={submit}
          disabled={!transcript.trim()}
          className="ml-auto"
        >
          <CheckCircle2 className="w-3 h-3 mr-1" /> Submit reasoning
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN QUESTION RUNNER
// ============================================================================

export default function QuestionRunner({ config, onComplete }) {
  const {
    concept, subject, exam,
    question_count = 8,
    duration_minutes,
    difficulty,
    assessmentMode = 'practice',
    title,
    studentHistory = [],
    conceptMasteryLevel = null,
    previousRecords = {},
    examEnvironment = null,
  } = config;

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

  // Reasoning state
  const [reasoningRequired, setReasoningRequired] = useState(false);
  const [reasoningTranscript, setReasoningTranscript] = useState("");
  const [answerChangedCount, setAnswerChangedCount] = useState({});
  const answerChangeCountsRef = useRef({});
  const reasoningData = useRef({}); // { [questionIndex]: { transcript, category, required } }
  const [reasoningPhase, setReasoningPhase] = useState(false); // true when showing reasoning input

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

      // Attach reasoning data
      result.reasoningData = reasoningData.current;
      result.reasoningAnalysis = null; // Will be computed by caller
      result.assessmentMode = assessmentMode;

      onComplete(result);
    },
    [questions, onComplete, idx, confidence, assessmentMode]
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

    // Check if first question needs reasoning
    if (questions && questions.length > 0) {
      checkReasoningNeeded(0);
    }
  };

  const checkReasoningNeeded = (questionIndex) => {
    if (!questions) return;
    const q = questions[questionIndex];
    const fastAnswer = perTimes.current[questionIndex] != null && perTimes.current[questionIndex] < 5;
    const changedCount = answerChangeCountsRef.current[questionIndex] || 0;

    const decision = shouldAskReasoning(q, questionIndex, {
      assessmentMode,
      previousAnswers: reasoningData.current,
      questionCount: questions.length,
      studentHistory,
      suspiciousFastAnswer: fastAnswer,
      answerChangedCount: changedCount,
      conceptMasteryLevel,
      diagnosticPhase: assessmentMode === 'diagnostic' && questionIndex < 3,
    });

    setReasoningRequired(decision.required);
    if (!decision.required) {
      setReasoningPhase(false);
    }
  };

  const goTo = (i) => {
    if (qEnteredAt.current)
      perTimes.current[idx] = (perTimes.current[idx] || 0) + (Date.now() - qEnteredAt.current) / 1000;
    setIdx(i);
    qEnteredAt.current = Date.now();
    setReasoningPhase(false);
    setReasoningTranscript("");
    checkReasoningNeeded(i);
  };

  const choose = (i) => {
    // Track answer changes
    if (answers[idx] !== undefined && answers[idx] !== i) {
      answerChangeCountsRef.current[idx] = (answerChangeCountsRef.current[idx] || 0) + 1;
    }
    setAnswers((a) => {
      const next = { ...a, [idx]: i };
      answersRef.current = next;
      return next;
    });
  };

  const handleReasoningSubmit = (transcript) => {
    setReasoningTranscript(transcript);
    // Store reasoning for this question
    reasoningData.current[idx] = {
      transcript,
      required: reasoningRequired,
      timestamp: Date.now(),
    };
    setReasoningPhase(false);
  };

  const handleSkipReasoning = () => {
    reasoningData.current[idx] = {
      transcript: "",
      required: reasoningRequired,
      skipped: true,
      timestamp: Date.now(),
    };
    setReasoningPhase(false);
  };

  const handleNext = () => {
    // If reasoning is required and we haven't done it yet, show reasoning input
    if (reasoningRequired && !reasoningData.current[idx] && answers[idx] !== undefined) {
      setReasoningPhase(true);
      return;
    }
    // Save current reasoning if we have it
    if (reasoningTranscript) {
      reasoningData.current[idx] = {
        transcript: reasoningTranscript,
        required: reasoningRequired,
        timestamp: Date.now(),
      };
    }
    goTo(idx + 1);
  };

  // Determine if we should show reasoning phase for current question
  const showReasoningInput = reasoningPhase && reasoningRequired && answers[idx] !== undefined;

  // Environment class for visual transformation
  const envClass = getEnvironmentClass(assessmentMode, examEnvironment);

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
    const modeLabel = getModeLabel(assessmentMode);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto p-6 text-center"
      >
        <div className="text-xs font-medium text-indigo-600 mb-1 uppercase tracking-wider">{modeLabel}</div>
        <div className="text-sm text-muted-foreground mb-1">{title || "Assessment"}</div>
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
      </motion.div>
    );
  }

  const q = questions[idx];
  const mm = String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, timeLeft) % 60).padStart(2, "0");
  const answeredCount = Object.keys(answers).length;

  // Check if reasoning was already provided for this question
  const hasReasoning = !!reasoningData.current[idx];

  return (
    <div className={`max-w-2xl mx-auto p-4 sm:p-6 ${envClass}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <Badge variant="secondary">
          {answeredCount}/{questions.length} answered
        </Badge>
        {timed && (
          <div className={`flex items-center gap-1 font-mono text-sm ${timeLeft < 60 ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
            <Clock className="w-4 h-4" /> {mm}:{ss}
          </div>
        )}
      </div>
      <Progress value={(answeredCount / questions.length) * 100} className="mb-6 h-1.5" />

      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {/* Question header */}
          <div className="text-xs text-muted-foreground mb-1 capitalize">
            Question {idx + 1} · {q.provenance ? q.provenance.replace(/_/g, " ") : "practice"}
          </div>
          {q.source_label && <div className="text-[10px] text-amber-600 mb-2">⚠ {q.source_label}</div>}

          {/* Question text */}
          <div className="text-base font-medium mb-4">{q.question_text}</div>

          {/* Answer choices */}
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={showReasoningInput || hasReasoning}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${
                  answers[idx] === i
                    ? "border-indigo-500 bg-indigo-50"
                    : "hover:border-indigo-300 bg-card"
                } ${showReasoningInput || hasReasoning ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                <span className="font-mono mr-2 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>

          {/* Reasoning checkpoint */}
          {showReasoningInput && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-sm font-medium text-indigo-900">Why did you choose this answer?</div>
              </div>
              <VoiceReasoning onTranscript={handleReasoningSubmit} disabled={false} />
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleSkipReasoning} className="text-muted-foreground text-xs">
                  Skip reasoning
                </Button>
              </div>
            </motion.div>
          )}

          {/* Reasoning provided indicator */}
          {hasReasoning && !showReasoningInput && (
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              Reasoning recorded
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="ghost" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
          Back
        </Button>
        {idx < questions.length - 1 ? (
          <Button onClick={handleNext}>
            {reasoningRequired && !hasReasoning ? "Explain reasoning" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={() => submit(answersRef.current)}>
            <Flag className="w-4 h-4 mr-1" /> Submit
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getModeLabel(mode) {
  const labels = {
    practice: "Practice",
    diagnostic: "Diagnostic Assessment",
    quiz: "Quiz",
    exam: "Exam Simulation",
    mastery_check: "Mastery Check",
    challenge: "Challenge",
    review: "Review",
  };
  return labels[mode] || "Assessment";
}

function getEnvironmentClass(mode, envTheme) {
  if (envTheme) return envTheme;

  const classes = {
    exam: "bg-slate-50 dark:bg-slate-950",
    mastery_check: "bg-indigo-50/30 dark:bg-indigo-950/30",
    challenge: "bg-amber-50/30 dark:bg-amber-950/30",
    diagnostic: "bg-emerald-50/30 dark:bg-emerald-950/30",
  };
  return classes[mode] || "";
}
