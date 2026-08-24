// ============================================================================
// EXAM AUTOPSY — Detailed post-simulation analysis
// ============================================================================
// After every meaningful simulation, provides:
// - Score, correct, incorrect, unanswered
// - Concepts missed
// - Recurring mistakes
// - Time problems
// - Confidence problems
// - Improvement vs previous
// - Readiness assessment
// - Exact next action
// ============================================================================

import { inferPattern } from './assessment';
import { buildEvidenceReport } from './report';
import { computeMastery } from './mastery';

// ============================================================================
// AUTOPSY ANALYSIS
// ============================================================================

/**
 * Perform a full autopsy on exam/simulation results
 * @param {Object} config - { concept, subject, exam, question_count, duration_minutes }
 * @param {Object} result - { score, correct, total, unanswered, mistakes, perQuestionTimes, totalTime, confidence, question_ids }
 * @param {Object} prevRecord - Previous learning record for this concept (if any)
 * @param {Array} allRecords - All learning records for broader context
 * @param {Object} target - Student's exam target (from targetScore.js)
 */
export function performAutopsy(config, result, prevRecord, allRecords = [], target = null) {
  // Base evidence report
  const baseReport = buildEvidenceReport(config, result, prevRecord);

  // Detailed mistake analysis
  const mistakeAnalysis = analyzeMistakes(result.mistakes || []);

  // Time analysis
  const timeAnalysis = analyzeTime(config, result);

  // Confidence analysis
  const confidenceAnalysis = analyzeConfidence(result);

  // Improvement tracking
  const improvement = trackImprovement(config, result, prevRecord);

  // Readiness assessment
  const readiness = assessReadiness(config, result, prevRecord, allRecords, target);

  // Next action recommendation
  const nextAction = recommendNextAction(baseReport, mistakeAnalysis, timeAnalysis, confidenceAnalysis, readiness, target);

  // Build comprehensive autopsy report
  const autopsy = {
    // Core results
    score: result.score,
    correct: result.correct,
    incorrect: result.total - result.correct - (result.unanswered || 0),
    unanswered: result.unanswered || 0,
    total: result.total,

    // Concept analysis
    concept: config.concept,
    subject: config.subject,
    exam: config.exam,

    // Detailed breakdowns
    mistakeAnalysis,
    timeAnalysis,
    confidenceAnalysis,
    improvement,

    // Assessment
    readiness,
    nextAction,

    // Legacy compatibility
    patterns: baseReport.patterns,
    knowledgeState: baseReport.knowledgeState,
    readyForHarder: baseReport.readyForHarder,
  };

  return autopsy;
}

// ============================================================================
// MISTAKE ANALYSIS
// ============================================================================

function analyzeMistakes(mistakes) {
  if (!mistakes.length) {
    return {
      count: 0,
      patterns: [],
      questionDetails: [],
      rootCauses: [],
    };
  }

  const patterns = {};
  const questionDetails = [];
  const rootCauses = [];

  for (const m of mistakes) {
    const pattern = m.pattern || inferPattern(m);
    patterns[pattern] = (patterns[pattern] || 0) + 1;

    questionDetails.push({
      question: m.question?.question_text || 'Unknown question',
      concept: m.question?.concept || 'Unknown',
      studentAnswer: m.student,
      correctAnswer: m.correct,
      pattern,
      difficulty: m.question?.difficulty || 'unknown',
    });
  }

  // Determine root causes from patterns
  const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sortedPatterns) {
    const severity = count >= 3 ? 'critical' : count >= 2 ? 'moderate' : 'minor';
    rootCauses.push({
      pattern,
      count,
      severity,
      description: describePattern(pattern),
      recommendation: recommendForPattern(pattern),
    });
  }

  return {
    count: mistakes.length,
    patterns: sortedPatterns.map(([pattern, count]) => ({ pattern, count })),
    questionDetails,
    rootCauses,
  };
}

function describePattern(pattern) {
  const descriptions = {
    sign_error: 'Sign/direction errors — choosing the wrong sign or opposite answer',
    formula_confusion: 'Formula confusion — using or misapplying formulas',
    misreading: 'Misreading — missing key words like "not", "except", "always"',
    concept_confusion: 'Concept confusion — fundamental misunderstanding of the topic',
    forgotten_prerequisite: 'Missing prerequisite knowledge — gaps from earlier topics',
    calculation_error: 'Calculation error — arithmetic mistakes in multi-step problems',
    careless: 'Careless error — knew the answer but made a hasty choice',
    time_pressure: 'Time pressure — rushing due to insufficient time',
    unknown: 'Unclassified mistake pattern',
  };
  return descriptions[pattern] || 'Unknown mistake pattern';
}

function recommendForPattern(pattern) {
  const recommendations = {
    sign_error: 'Practice with similar problems focusing on sign conventions. Slow down and double-check signs.',
    formula_confusion: 'Revisit the relevant formulas. Practice deriving them from first principles.',
    misreading: 'Practice reading questions more carefully. Underline key words before answering.',
    concept_confusion: 'Return to fundamentals. Request a lesson on the core concept.',
    forgotten_prerequisite: 'Review prerequisite topics before continuing. Use spaced review.',
    calculation_error: 'Practice mental math. Show all working steps clearly.',
    careless: 'Build a habit of reviewing answers before submitting.',
    time_pressure: 'Practice timed quizzes to improve speed. Focus on time management.',
    unknown: 'Review this question type carefully and discuss with Alpha.',
  };
  return recommendations[pattern] || 'Discuss with Alpha for personalized guidance.';
}

// ============================================================================
// TIME ANALYSIS
// ============================================================================

function analyzeTime(config, result) {
  const times = result.perQuestionTimes || [];
  const totalTime = result.totalTime || 0;

  if (!times.length && !totalTime) {
    return { timed: false, assessment: 'untimed' };
  }

  const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const maxTime = times.length ? Math.max(...times) : 0;
  const minTime = times.length ? Math.min(...times) : 0;
  const medianTime = times.length ? getMedian(times) : 0;

  const budgetPerQuestion = config.duration_minutes
    ? (config.duration_minutes * 60) / (config.question_count || result.total || 1)
    : 0;

  const overBudgetCount = budgetPerQuestion > 0
    ? times.filter(t => t > budgetPerQuestion).length
    : 0;

  const rushedCount = times.filter(t => t < 15).length; // Less than 15 seconds is suspiciously fast

  let speedAssessment = 'optimal';
  if (avgTime > budgetPerQuestion * 1.3) speedAssessment = 'too_slow';
  else if (rushedCount > times.length * 0.3) speedAssessment = 'too_fast';
  else if (overBudgetCount > times.length * 0.5) speedAssessment = 'inconsistent';

  return {
    timed: true,
    avgTimeSec: Math.round(avgTime),
    maxTimeSec: Math.round(maxTime),
    minTimeSec: Math.round(minTime),
    medianTimeSec: Math.round(medianTime),
    totalTimeSec: Math.round(totalTime),
    budgetPerQuestionSec: Math.round(budgetPerQuestion),
    overBudgetCount,
    rushedCount,
    speedAssessment,
  };
}

function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ============================================================================
// CONFIDENCE ANALYSIS
// ============================================================================

function analyzeConfidence(result) {
  if (result.confidence == null) {
    return { measured: false };
  }

  const confidence = result.confidence;
  const score = result.score;

  // Confidence vs actual performance
  let alignment = 'aligned';
  if (confidence >= 4 && score < 60) alignment = 'overconfident';
  else if (confidence <= 2 && score >= 70) alignment = 'underconfident';
  else if (confidence >= 4 && score >= 70) alignment = 'well_calibrated';
  else if (confidence <= 2 && score < 50) alignment = 'aware_of_gaps';

  return {
    measured: true,
    confidence,
    alignment,
    description: describeConfidenceAlignment(alignment),
  };
}

function describeConfidenceAlignment(alignment) {
  const descriptions = {
    overconfident: 'You rated yourself higher than your actual performance. This is dangerous — you may skip studying topics you think you know.',
    underconfident: 'You rated yourself lower than your actual performance. You know more than you think — trust your preparation.',
    well_calibrated: 'Your confidence matches your performance. You have good self-awareness.',
    aware_of_gaps: 'You know where you struggle. This awareness is valuable — now let\'s fix those gaps.',
    aligned: 'Your confidence is reasonably aligned with your performance.',
  };
  return descriptions[alignment] || '';
}

// ============================================================================
// IMPROVEMENT TRACKING
// ============================================================================

function trackImprovement(config, result, prevRecord) {
  if (!prevRecord) {
    return {
      hasBaseline: false,
      message: 'First assessment — establishing baseline.',
    };
  }

  const scoreDelta = result.score - (prevRecord.last_score || 0);
  const masteryDelta = (computeMastery({
    ...prevRecord,
    attempts: (prevRecord.attempts || 0) + 1,
    correct: (prevRecord.correct || 0) + result.correct,
    last_score: result.score,
  }) || 0) - (prevRecord.mastery_score || 0);

  const attempts = (prevRecord.attempts || 0) + 1;

  let trend = 'stable';
  if (scoreDelta > 5) trend = 'improving';
  else if (scoreDelta < -5) trend = 'declining';

  return {
    hasBaseline: true,
    previousScore: prevRecord.last_score,
    currentScore: result.score,
    scoreDelta,
    masteryDelta: Math.round(masteryDelta),
    attempts,
    trend,
    message: trend === 'improving'
      ? `Improved by ${scoreDelta} points since last attempt.`
      : trend === 'declining'
      ? `Score dropped ${Math.abs(scoreDelta)} points. Needs attention.`
      : 'Score is stable — try a different approach to break through.',
  };
}

// ============================================================================
// READINESS ASSESSMENT
// ============================================================================

function assessReadiness(config, result, prevRecord, allRecords, target) {
  const score = result.score;
  const mistakes = result.mistakes || [];
  const unanswered = result.unanswered || 0;

  // Count total attempts for this concept
  const conceptRecords = allRecords.filter(r => r.concept === config.concept);
  const totalAttempts = conceptRecords.reduce((sum, r) => sum + (r.attempts || 0), 0) + 1;

  // Consistency check — look at last few scores
  const recentScores = conceptRecords
    .slice(0, 5)
    .map(r => r.last_score)
    .filter(s => s != null);
  recentScores.push(result.score);

  const avgRecent = recentScores.length
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : result.score;

  const consistencyVariance = recentScores.length > 1
    ? Math.sqrt(recentScores.reduce((sum, s) => sum + Math.pow(s - avgRecent, 2), 0) / recentScores.length)
    : 0;

  const isConsistent = consistencyVariance < 15;

  // Determine readiness level
  let readiness = 'NOT_READY';
  let reason = '';

  if (score >= 85 && isConsistent && mistakes.length <= 1 && unanswered === 0) {
    readiness = 'READY';
    reason = 'Strong, consistent performance with minimal errors.';
  } else if (score >= 75 && isConsistent && mistakes.length <= 2) {
    readiness = 'ALMOST_READY';
    reason = 'Good performance but needs more consistency.';
  } else if (score >= 60 || avgRecent >= 60) {
    readiness = 'DEVELOPING';
    reason = 'Making progress — continue building mastery.';
  } else {
    readiness = 'NOT_READY';
    reason = 'Needs more foundational work.';
  }

  // Target-ready check
  if (target && target.band) {
    const targetPercent = target.band.perSubjectTarget || 75;
    if (score >= targetPercent && isConsistent && totalAttempts >= 5) {
      readiness = 'TARGET_READY';
      reason = `Consistently meeting the ${target.band.label} target.`;
    }
  }

  return {
    level: readiness,
    reason,
    score,
    avgRecentScore: Math.round(avgRecent),
    consistencyVariance: Math.round(consistencyVariance),
    isConsistent,
    totalAttempts,
    recentScores,
  };
}

// ============================================================================
// NEXT ACTION RECOMMENDATION
// ============================================================================

function recommendNextAction(baseReport, mistakeAnalysis, timeAnalysis, confidenceAnalysis, readiness, target) {
  const score = baseReport.score;
  const patterns = mistakeAnalysis.rootCauses || [];

  // Priority 1: If there are critical mistakes, repair them
  const criticalPattern = patterns.find(p => p.severity === 'critical');
  if (criticalPattern) {
    return {
      type: 'mistake_clinic',
      pattern: criticalPattern.pattern,
      reason: `${criticalPattern.count} mistakes in the "${criticalPattern.pattern}" pattern. This needs immediate repair.`,
    };
  }

  // Priority 2: If score is very low, reteach
  if (score < 40) {
    return {
      type: 'lesson',
      reason: 'Score is below 40%. The concept needs to be re-taught from fundamentals.',
    };
  }

  // Priority 3: If overconfident, do a reality-check quiz
  if (confidenceAnalysis.alignment === 'overconfident') {
    return {
      type: 'quiz',
      reason: 'Your confidence exceeds your performance. A focused quiz will help calibrate.',
    };
  }

  // Priority 4: If too slow, speed training
  if (timeAnalysis.speedAssessment === 'too_slow') {
    return {
      type: 'quiz',
      duration: 600,
      reason: 'Speed needs improvement. Timed practice will help.',
    };
  }

  // Priority 5: If almost ready, do a mastery check
  if (readiness.level === 'ALMOST_READY') {
    return {
      type: 'mastery_check',
      reason: 'Almost there — a final mastery check to confirm understanding.',
    };
  }

  // Priority 6: If ready and has target, push harder
  if (readiness.level === 'READY' && target) {
    return {
      type: 'challenge',
      reason: 'Strong performance. Let\'s push beyond exam level for a safety margin.',
    };
  }

  // Priority 7: If improving, keep practicing
  if (score >= 50 && score < 75) {
    return {
      type: 'practice',
      reason: 'Building momentum. More practice will solidify understanding.',
    };
  }

  // Default: review and practice
  return {
    type: 'review',
    reason: 'Spaced review will help retain what you\'ve learned.',
  };
}

// ============================================================================
// AUTOPSY SUMMARY FOR LLM
// ============================================================================

/**
 * Build a text summary of the autopsy for the AI to narrate
 */
export function buildAutopsySummary(autopsy) {
  let s = `EXAM AUTOPSY for "${autopsy.concept}" (${autopsy.exam || ''}):\n`;
  s += `- Score: ${autopsy.score}% (${autopsy.correct}/${autopsy.total} correct, ${autopsy.incorrect} incorrect, ${autopsy.unanswered} unanswered)\n`;

  if (autopsy.improvement.hasBaseline) {
    s += `- Trend: ${autopsy.improvement.message}\n`;
  }

  if (autopsy.mistakeAnalysis.count > 0) {
    s += `- Mistakes: ${autopsy.mistakeAnalysis.count} total\n`;
    for (const rc of autopsy.mistakeAnalysis.rootCauses) {
      s += `  • ${rc.pattern} (${rc.count}x, ${rc.severity}): ${rc.description}\n`;
    }
  }

  if (autopsy.timeAnalysis.timed) {
    s += `- Speed: ${autopsy.timeAnalysis.speedAssessment} (avg ${autopsy.timeAnalysis.avgTimeSec}s per question)\n`;
  }

  if (autopsy.confidenceAnalysis.measured) {
    s += `- Confidence: ${autopsy.confidenceAnalysis.alignment} (${autopsy.confidenceAnalysis.confidence}/5)\n`;
  }

  s += `- Readiness: ${autopsy.readiness.level} — ${autopsy.readiness.reason}\n`;
  s += `- Next action: ${autopsy.nextAction.type} — ${autopsy.nextAction.reason}\n`;

  return s;
}
