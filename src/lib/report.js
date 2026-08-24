import { inferPattern } from "./assessment";
import { analyzeAllReasoning, getReasoningMasteryMultiplier } from "./reasoning";

// Deterministic, evidence-based report. Alpha narrates from this — never invents it.
export function buildEvidenceReport(config, result, prevRecord) {
  const patterns = {};
  (result.mistakes || []).forEach((m) => {
    const p = m.pattern || inferPattern(m);
    patterns[p] = (patterns[p] || 0) + 1;
  });
  const topPatterns = Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .map(([pattern, count]) => ({ pattern, count }));

  const times = result.perQuestionTimes || [];
  const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const perQuestionBudget = config.duration_minutes
    ? (config.duration_minutes * 60) / (config.question_count || 1)
    : 0;
  const timeProblem = perQuestionBudget > 0 && avgTime > perQuestionBudget * 1.5;

  const improvement = prevRecord && prevRecord.last_score != null
    ? result.score - prevRecord.last_score
    : null;

  const readyForHarder =
    result.score >= 80 &&
    topPatterns.length === 0 &&
    (result.unanswered || 0) === 0 &&
    !timeProblem;

  const confidence = result.confidence != null ? result.confidence : null;
  let knowledgeState = null;
  if (confidence != null) {
    const confident = confidence >= 4;
    const didWell = result.score >= 70;
    knowledgeState = confident && didWell
      ? "strong"
      : confident && !didWell
      ? "dangerous_misconception"
      : !confident && didWell
      ? "fragile"
      : "needs_teaching";
  }

  // ── Reasoning analysis ──────────────────────────────────────────────
  let reasoningAnalysis = null;
  const reasoningData = result.reasoningData || {};
  if (Object.keys(reasoningData).length > 0) {
    // Build question results for reasoning analysis
    const questionResults = [];
    for (const [idx, data] of Object.entries(reasoningData)) {
      const i = parseInt(idx);
      const q = (config.questions || [])[i] || {};
      const selectedAnswer = result.mistakes?.find(m => m.question?.question_text === q.question_text)
        ? result.mistakes.find(m => m.question?.question_text === q.question_text).student
        : (result.selectedAnswers || [])[i];
      const correctAnswer = q.correct_index;
      const isCorrect = selectedAnswer === correctAnswer;

      questionResults.push({
        questionIndex: i,
        question: q,
        reasoning: data.transcript || "",
        selectedAnswer: selectedAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        reasoningRequired: data.required || false,
      });
    }
    reasoningAnalysis = analyzeAllReasoning(questionResults);
  }

  const report = {
    score: result.score,
    correct: result.correct,
    total: result.total,
    unanswered: result.unanswered || 0,
    concepts: [config.concept],
    patterns: topPatterns,
    avgTimeSec: Math.round(avgTime),
    timeProblem,
    improvement,
    readyForHarder,
    confidence,
    knowledgeState,
    assessmentMode: result.assessmentMode || config.assessmentMode || 'practice',
  };

  // Attach reasoning analysis if available
  if (reasoningAnalysis) {
    report.reasoningAnalysis = reasoningAnalysis;
    report.understandingLevel = reasoningAnalysis.understandingLevel;
    report.reasoningScore = reasoningAnalysis.reasoningScore;
    report.misconceptionsDetected = reasoningAnalysis.misconceptionCount;
    report.guessCount = reasoningAnalysis.guessCount;
    report.reasoningSummary = reasoningAnalysis.summary;
  }

  return report;
}