import { inferPattern } from "./assessment";

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

  return {
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
  };
}