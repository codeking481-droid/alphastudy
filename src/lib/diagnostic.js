// ============================================================================
// DIAGNOSTIC ENGINE — Adaptive assessment that builds a student learning map
// ============================================================================
// Does NOT give every student the same giant test.
// Uses answers to quickly determine strengths, weaknesses, missing prerequisites.
// ============================================================================

import { getConceptsForSubject, getPrerequisites, CURRICULUM } from './curriculum';

// ============================================================================
// DIAGNOSTIC CONFIGURATION
// ============================================================================

/**
 * Diagnostic strategy:
 * 1. Start with a broad concept from each subject (3-5 questions each)
 * 2. Based on answers, zoom into weak areas
 * 3. Test prerequisites if a concept is missed
 * 4. Track time per question for speed assessment
 * 5. Total: 30-50 questions across all subjects (not 200)
 */

const DIAGNOSTIC_CONFIG = {
  questionsPerConcept: 3,
  initialConceptsPerSubject: 3,
  maxQuestionsPerSubject: 12,
  totalMaxQuestions: 50,
  difficultyRange: ['beginner', 'intermediate', 'advanced'],
  timePerQuestion: 90, // seconds — generous for diagnostic
};

// ============================================================================
// DIAGNOSTIC PLANNING
// ============================================================================

/**
 * Build a diagnostic plan for a student
 * Selects which concepts to test based on the exam and selected subjects
 */
export function buildDiagnosticPlan(exam, subjects, existingRecords = []) {
  const plan = {
    exam,
    subjects: [],
    totalEstimatedQuestions: 0,
  };

  for (const subject of subjects) {
    const allConcepts = getConceptsForSubject(exam, subject);
    if (!allConcepts.length) continue;

    // Determine which concepts to test
    const conceptsToTest = selectDiagnosticConcepts(allConcepts, existingRecords, subject);

    plan.subjects.push({
      subject,
      concepts: conceptsToTest,
      questionCount: conceptsToTest.length * DIAGNOSTIC_CONFIG.questionsPerConcept,
    });
    plan.totalEstimatedQuestions += conceptsToTest.length * DIAGNOSTIC_CONFIG.questionsPerConcept;
  }

  // Cap total questions
  if (plan.totalEstimatedQuestions > DIAGNOSTIC_CONFIG.totalMaxQuestions) {
    const ratio = DIAGNOSTIC_CONFIG.totalMaxQuestions / plan.totalEstimatedQuestions;
    for (const s of plan.subjects) {
      s.questionCount = Math.max(3, Math.round(s.questionCount * ratio));
    }
    plan.totalEstimatedQuestions = DIAGNOSTIC_CONFIG.totalMaxQuestions;
  }

  return plan;
}

/**
 * Select which concepts to include in the diagnostic
 * Prioritizes breadth (cover many concepts) over depth
 */
function selectDiagnosticConcepts(allConcepts, existingRecords, subject) {
  const recordMap = {};
  existingRecords.forEach(r => { recordMap[r.concept] = r; });

  // Group concepts by topic
  const byTopic = {};
  allConcepts.forEach(c => {
    if (!byTopic[c.topic]) byTopic[c.topic] = [];
    byTopic[c.topic].push(c);
  });

  const selected = [];

  // Pick 1-2 concepts from each topic for breadth
  for (const topic of Object.keys(byTopic)) {
    const topicConcepts = byTopic[topic];

    // If student has records, prioritize untested concepts
    const untested = topicConcepts.filter(c => !recordMap[c.name]);
    const tested = topicConcepts.filter(c => recordMap[c.name]);

    // Take first untested, or weakest tested
    if (untested.length > 0) {
      selected.push(untested[0]);
    }
    if (tested.length > 0) {
      const weakest = tested.sort((a, b) =>
        (recordMap[a.name]?.mastery_score || 0) - (recordMap[b.name]?.mastery_score || 0)
      )[0];
      if (!selected.find(s => s.name === weakest.name)) {
        selected.push(weakest);
      }
    }

    // If we have room, add one more from this topic
    if (selected.length < DIAGNOSTIC_CONFIG.initialConceptsPerSubject * 2) {
      const remaining = topicConcepts.filter(c => !selected.find(s => s.name === c.name));
      if (remaining.length > 0) selected.push(remaining[0]);
    }
  }

  return selected.slice(0, DIAGNOSTIC_CONFIG.maxQuestionsPerSubject / DIAGNOSTIC_CONFIG.questionsPerConcept);
}

// ============================================================================
// DIAGNOSTIC ANALYSIS
// ============================================================================

/**
 * Analyze diagnostic results and build a student learning map
 * Input: array of { concept, subject, result: { score, correct, total, mistakes, timePerQuestion } }
 */
export function analyzeDiagnosticResults(results) {
  const analysis = {
    strongConcepts: [],
    weakConcepts: [],
    missingPrerequisites: [],
    speedAssessment: 'normal',
    recurringPatterns: {},
    confidenceVsCorrectness: [],
    subjectBreakdown: {},
    overallReadiness: 0,
    recommendedFocus: null,
  };

  const allResults = [];
  const subjectResults = {};

  for (const r of results) {
    const { concept, subject, result } = r;
    const score = result.score;
    const avgTime = result.perQuestionTimes?.length
      ? result.perQuestionTimes.reduce((a, b) => a + b, 0) / result.perQuestionTimes.length
      : null;

    allResults.push({ concept, subject, score, avgTime, mistakes: result.mistakes || [] });

    if (!subjectResults[subject]) subjectResults[subject] = [];
    subjectResults[subject].push({ concept, score, avgTime });
  }

  // Classify concepts
  for (const r of allResults) {
    if (r.score >= 70) {
      analysis.strongConcepts.push({ concept: r.concept, subject: r.subject, score: r.score });
    } else if (r.score < 50) {
      analysis.weakConcepts.push({ concept: r.concept, subject: r.subject, score: r.score });
    }
  }

  // Check prerequisites for weak concepts
  for (const w of analysis.weakConcepts) {
    const prereqs = getPrerequisites(w.subject, w.subject, w.concept);
    const strongNames = analysis.strongConcepts.map(s => s.concept);
    const missingPrereqs = prereqs.filter(p => !strongNames.includes(p.name));
    if (missingPrereqs.length > 0) {
      analysis.missingPrerequisites.push({
        concept: w.concept,
        subject: w.subject,
        missing: missingPrereqs.map(p => p.name),
      });
    }
  }

  // Speed assessment
  const allTimes = allResults.filter(r => r.avgTime != null).map(r => r.avgTime);
  if (allTimes.length > 0) {
    const overallAvgTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
    if (overallAvgTime > 120) analysis.speedAssessment = 'slow';
    else if (overallAvgTime > 90) analysis.speedAssessment = 'normal';
    else analysis.speedAssessment = 'fast';
  }

  // Pattern analysis
  for (const r of allResults) {
    for (const m of r.mistakes) {
      const pattern = m.pattern || 'unknown';
      analysis.recurringPatterns[pattern] = (analysis.recurringPatterns[pattern] || 0) + 1;
    }
  }

  // Subject breakdown
  for (const [subject, sResults] of Object.entries(subjectResults)) {
    const avgScore = Math.round(sResults.reduce((sum, r) => sum + r.score, 0) / sResults.length);
    const conceptsCovered = sResults.length;
    const avgTime = sResults.filter(r => r.avgTime != null).length
      ? Math.round(sResults.filter(r => r.avgTime != null).reduce((sum, r) => sum + r.avgTime, 0) /
          sResults.filter(r => r.avgTime != null).length)
      : null;

    analysis.subjectBreakdown[subject] = {
      avgScore,
      conceptsCovered,
      avgTimePerQuestion: avgTime,
      strongConcepts: sResults.filter(r => r.score >= 70).map(r => r.concept),
      weakConcepts: sResults.filter(r => r.score < 50).map(r => r.concept),
    };
  }

  // Overall readiness (0-100)
  if (allResults.length > 0) {
    const avgAll = allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length;
    analysis.overallReadiness = Math.round(avgAll);
  }

  // Recommended focus
  const sortedSubjects = Object.entries(analysis.subjectBreakdown)
    .sort((a, b) => a[1].avgScore - b[1].avgScore);

  if (sortedSubjects.length > 0) {
    const weakest = sortedSubjects[0];
    analysis.recommendedFocus = {
      subject: weakest[0],
      reason: `Lowest average score (${weakest[1].avgScore}%)`,
      concepts: weakest[1].weakConcepts,
    };
  }

  return analysis;
}

/**
 * Build a diagnostic memory summary for the LLM
 */
export function buildDiagnosticSummary(analysis) {
  let s = 'DIAGNOSTIC RESULTS:\n';
  s += `- Overall readiness: ${analysis.overallReadiness}%\n`;
  s += `- Speed: ${analysis.speedAssessment}\n`;
  s += `- Strong concepts: ${analysis.strongConcepts.map(c => `${c.concept} (${c.score}%)`).join(', ') || 'none yet'}\n`;
  s += `- Weak concepts: ${analysis.weakConcepts.map(c => `${c.concept} (${c.score}%)`).join(', ') || 'none'}\n`;

  if (analysis.missingPrerequisites.length > 0) {
    s += `- Missing prerequisites: ${analysis.missingPrerequisites.map(m =>
      `${m.concept} (missing: ${m.missing.join(', ')})`
    ).join('; ')}\n`;
  }

  const patterns = Object.entries(analysis.recurringPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (patterns.length > 0) {
    s += `- Recurring mistake patterns: ${patterns.map(([p, c]) => `${p}(${c})`).join(', ')}\n`;
  }

  s += '- Subject breakdown:\n';
  for (const [subject, data] of Object.entries(analysis.subjectBreakdown)) {
    s += `  ${subject}: ${data.avgScore}% avg, ${data.conceptsCovered} concepts tested`;
    if (data.weakConcepts.length) s += `, weaknesses: ${data.weakConcepts.join(', ')}`;
    s += '\n';
  }

  if (analysis.recommendedFocus) {
    s += `- Highest priority: ${analysis.recommendedFocus.subject} — ${analysis.recommendedFocus.reason}\n`;
  }

  return s;
}
