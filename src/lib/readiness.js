// ============================================================================
// READINESS ENGINE — Evidence-based readiness assessment
// ============================================================================
// Readiness states:
//   NOT_READY    — needs foundational work
//   DEVELOPING   — making progress, concepts building
//   ALMOST_READY — strong but needs consistency
//   READY        — solid performance, can handle the exam
//   TARGET_READY — consistently meeting the student's chosen target
//
// "Target Ready" only appears when the student has REPEATEDLY demonstrated
// performance near the selected goal across realistic simulations.
// One lucky test does NOT create readiness.
// ============================================================================

import { computeMastery, isMastered } from './mastery';
import { getSyllabusCoverage } from './curriculum';

// ============================================================================
// READINESS LEVELS
// ============================================================================

export const READINESS_LEVELS = {
  NOT_READY: {
    label: 'Not Ready',
    description: 'Needs foundational work before attempting exam-level material',
    color: 'rose',
    emoji: '🔴',
    minScore: 0,
    minMastery: 0,
    minSimulations: 0,
    minConsistency: 0,
  },
  DEVELOPING: {
    label: 'Developing',
    description: 'Building understanding but still has significant gaps',
    color: 'amber',
    emoji: '🟡',
    minScore: 40,
    minMastery: 30,
    minSimulations: 2,
    minConsistency: 0,
  },
  ALMOST_READY: {
    label: 'Almost Ready',
    description: 'Good performance but needs more consistency',
    color: 'blue',
    emoji: '🔵',
    minScore: 65,
    minMastery: 60,
    minSimulations: 3,
    minConsistency: 0.5,
  },
  READY: {
    label: 'Ready',
    description: 'Solid performance, can handle the exam',
    color: 'emerald',
    emoji: '🟢',
    minScore: 75,
    minMastery: 75,
    minSimulations: 5,
    minConsistency: 0.7,
  },
  TARGET_READY: {
    label: 'Target Ready',
    description: 'Consistently meeting the chosen target across realistic simulations',
    color: 'violet',
    emoji: '⭐',
    minScore: 85,
    minMastery: 85,
    minSimulations: 8,
    minConsistency: 0.85,
  },
};

// ============================================================================
// READINESS CALCULATION
// ============================================================================

/**
 * Calculate readiness for a concept based on all available evidence
 * @param {Object} record - Learning record for this concept
 * @param {Array} recentResults - Array of recent simulation results [{ score, confidence, totalTime }]
 * @param {Object} target - Student's exam target (optional)
 * @returns {Object} readiness assessment
 */
export function calculateReadiness(record, recentResults = [], target = null) {
  if (!record) {
    return {
      level: 'NOT_READY',
      score: 0,
      factors: { mastery: 0, consistency: 0, volume: 0, speed: 0, targetProximity: 0 },
      explanation: 'No evidence yet — needs assessment.',
    };
  }

  // Factor 1: Mastery score (0-100)
  const mastery = computeMastery(record);

  // Factor 2: Consistency — how stable are recent scores
  const scores = recentResults.map(r => r.score).filter(s => s != null);
  if (record.last_score != null) scores.push(record.last_score);
  const consistency = calculateConsistency(scores);

  // Factor 3: Volume — enough practice attempts
  const attempts = record.attempts || 0;
  const volume = Math.min(1, attempts / 10); // 10+ attempts = full volume credit

  // Factor 4: Speed — based on time performance (if available)
  const speed = calculateSpeedScore(recentResults);

  // Factor 5: Target proximity — how close to the target
  const targetProximity = calculateTargetProximity(record, target);

  // Weighted readiness score
  const readinessScore = (
    mastery * 0.35 +
    consistency * 0.25 +
    volume * 0.15 +
    speed * 0.10 +
    targetProximity * 0.15
  );

  // Determine readiness level
  const level = determineLevel(readinessScore, mastery, consistency, attempts, scores, target);

  // Build explanation
  const explanation = buildExplanation(level, mastery, consistency, attempts, scores, target);

  return {
    level,
    score: Math.round(readinessScore),
    factors: {
      mastery: Math.round(mastery),
      consistency: Math.round(consistency * 100),
      volume: Math.round(volume * 100),
      speed: Math.round(speed * 100),
      targetProximity: Math.round(targetProximity * 100),
    },
    explanation,
    dataPoints: {
      attempts,
      recentScores: scores,
      lastScore: record.last_score,
      streak: record.streak || 0,
    },
  };
}

/**
 * Calculate readiness across all subjects for an exam
 */
export function calculateExamReadiness(exam, records, subjectRecords, target = null) {
  const subjectReadiness = {};

  for (const [subject, records] of Object.entries(subjectRecords)) {
    const conceptReadiness = records.map(r => {
      const recentResults = records
        .filter(rec => rec.concept === r.concept)
        .map(rec => ({ score: rec.last_score }))
        .filter(res => res.score != null);
      return calculateReadiness(r, recentResults, target);
    });

    const avgScore = conceptReadiness.length
      ? Math.round(conceptReadiness.reduce((sum, cr) => sum + cr.score, 0) / conceptReadiness.length)
      : 0;

    const level = determineLevel(
      avgScore,
      avgScore, // simplified mastery
      conceptReadiness.length ? conceptReadiness.every(cr => cr.factors.consistency > 50) ? 1 : 0 : 0,
      records.reduce((sum, r) => sum + (r.attempts || 0), 0),
      records.map(r => r.last_score).filter(s => s != null),
      target,
    );

    subjectReadiness[subject] = {
      level,
      avgScore,
      conceptCount: records.length,
      concepts: conceptReadiness,
    };
  }

  // Overall exam readiness
  const allScores = Object.values(subjectReadiness).map(sr => sr.avgScore);
  const overallScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  const overallLevel = determineLevel(
    overallScore,
    overallScore,
    Object.values(subjectReadiness).every(sr => sr.level === 'TARGET_READY' || sr.level === 'READY') ? 1 : 0,
    records.reduce((sum, r) => sum + (r.attempts || 0), 0),
    records.map(r => r.last_score).filter(s => s != null),
    target,
  );

  return {
    exam,
    overallLevel,
    overallScore,
    subjectReadiness,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateConsistency(scores) {
  if (scores.length < 2) return 0;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Lower stdDev = higher consistency (max 15 stdDev = 0 consistency)
  return Math.max(0, 1 - stdDev / 15);
}

function calculateSpeedScore(recentResults) {
  const timedResults = recentResults.filter(r => r.totalTime > 0);
  if (!timedResults.length) return 0.5; // neutral if no timing data

  // Good speed = completing within time limit without rushing
  const avgTime = timedResults.reduce((sum, r) => sum + r.totalTime, 0) / timedResults.length;
  // Assume 600 seconds (10 min) is good baseline
  if (avgTime < 300) return 0.6; // might be rushing
  if (avgTime <= 600) return 1.0;
  if (avgTime <= 900) return 0.7;
  return 0.4;
}

function calculateTargetProximity(record, target) {
  if (!target || !target.band) return 0.5;

  const targetPercent = target.band.perSubjectTarget || 75;
  const currentScore = record.last_score || 0;

  if (currentScore >= targetPercent) return 1.0;
  if (currentScore >= targetPercent * 0.8) return 0.8;
  if (currentScore >= targetPercent * 0.6) return 0.5;
  if (currentScore >= targetPercent * 0.4) return 0.3;
  return 0.1;
}

function determineLevel(score, mastery, consistency, attempts, recentScores, target) {
  // Check from highest to lowest
  const minScores = Object.entries(READINESS_LEVELS).reverse();

  for (const [level, config] of minScores) {
    if (level === 'NOT_READY') continue; // always check this last

    const meetsScore = score >= config.minScore;
    const meetsMastery = mastery >= config.minMastery;
    const meetsSimulations = attempts >= config.minSimulations;
    const meetsConsistency = consistency >= config.minConsistency;

    if (meetsScore && meetsMastery && meetsSimulations && meetsConsistency) {
      // For TARGET_READY, also require recent scores to be consistently high
      if (level === 'TARGET_READY' && recentScores.length >= 3) {
        const recentAvg = recentScores.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, recentScores.length);
        if (recentAvg < 80) continue; // need at least 80% average in recent tests
      }

      // For READY, require at least 3 recent tests with 70%+ average
      if (level === 'READY' && recentScores.length >= 3) {
        const recentAvg = recentScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        if (recentAvg < 70) continue;
      }

      return level;
    }
  }

  return 'NOT_READY';
}

function buildExplanation(level, mastery, consistency, attempts, recentScores, target) {
  const parts = [];

  switch (level) {
    case 'TARGET_READY':
      parts.push('You are consistently performing at or above your target level.');
      if (target) parts.push(`Your ${target.band?.label || 'target'} goal is within reach.`);
      parts.push('Consider harder-than-exam challenges for a safety margin.');
      break;
    case 'READY':
      parts.push('You have solid mastery and are performing well in practice.');
      parts.push('Keep doing simulations to maintain and improve consistency.');
      break;
    case 'ALMOST_READY':
      parts.push('Good progress — you understand the material but need more consistency.');
      if (consistency < 50) parts.push('Your scores vary a lot. More practice will help stabilize.');
      if (attempts < 5) parts.push('More practice attempts will help build confidence.');
      break;
    case 'DEVELOPING':
      parts.push('You\'re making progress but still have gaps to fill.');
      if (mastery < 50) parts.push('Focus on building mastery of individual concepts.');
      break;
    case 'NOT_READY':
      parts.push('This concept needs foundational work before exam-level practice.');
      if (attempts === 0) parts.push('Start with a lesson to understand the basics.');
      else if (recentScores.length && recentScores[recentScores.length - 1] < 40) parts.push('Consider relearning this concept from scratch.');
      break;
  }

  return parts.join(' ');
}
