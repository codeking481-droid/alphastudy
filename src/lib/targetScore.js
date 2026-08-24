// ============================================================================
// TARGET SCORE ENGINE — Translates exam targets into subject-level goals
// ============================================================================
// Evidence-based. Never promises guaranteed results.
// The target affects Alpha's planning and priority decisions.
// ============================================================================

import { EXAMS, getConceptsForSubject, getSyllabusCoverage } from './curriculum';
import { computeMastery } from './mastery';

// ============================================================================
// TARGET DEFINITIONS
// ============================================================================

const JAMB_TARGETS = {
  200: {
    label: 'JAMB 200+',
    description: 'University admission baseline',
    requiredScore: 200,
    perSubjectTarget: 50, // ~50% per subject (200/400)
    strategy: 'Foundation building — ensure basics are solid across all subjects',
    difficultyProgression: ['beginner', 'intermediate'],
    simulationFrequency: 'weekly',
    minimumMasteryPerConcept: 40,
  },
  250: {
    label: 'JAMB 250+',
    description: 'Competitive university admission',
    requiredScore: 250,
    perSubjectTarget: 63, // ~63% per subject
    strategy: 'Solid understanding — focus on commonly tested areas and eliminate weak spots',
    difficultyProgression: ['intermediate', 'advanced'],
    simulationFrequency: 'twice_weekly',
    minimumMasteryPerConcept: 60,
  },
  300: {
    label: 'JAMB 300+',
    description: 'Top university programs',
    requiredScore: 300,
    perSubjectTarget: 75, // ~75% per subject
    strategy: 'Deep mastery — strong across all subjects, minimal gaps',
    difficultyProgression: ['intermediate', 'advanced', 'exam'],
    simulationFrequency: 'twice_weekly',
    minimumMasteryPerConcept: 75,
  },
  350: {
    label: 'JAMB 350+',
    description: 'Elite scholarship tier',
    requiredScore: 350,
    perSubjectTarget: 88, // ~88% per subject
    strategy: 'Near-perfection — tackle the hardest questions, speed training, full simulations',
    difficultyProgression: ['advanced', 'exam', 'challenge'],
    simulationFrequency: 'daily',
    minimumMasteryPerConcept: 85,
  },
  380: {
    label: 'JAMB 380+',
    description: 'Maximum readiness — top 1%',
    requiredScore: 380,
    perSubjectTarget: 95, // ~95% per subject
    strategy: 'Elite mastery — harder-than-exam challenges, speed precision, zero weak spots',
    difficultyProgression: ['exam', 'challenge'],
    simulationFrequency: 'daily',
    minimumMasteryPerConcept: 90,
  },
};

const WAEC_TARGETS = {
  'A1': {
    label: 'WAEC A1 (Excellent)',
    requiredPercent: 75,
    perSubjectTarget: 75,
    strategy: 'Excellent mastery across all subjects',
    difficultyProgression: ['advanced', 'exam'],
    simulationFrequency: 'twice_weekly',
    minimumMasteryPerConcept: 80,
  },
  'B2': {
    label: 'WAEC B2 (Very Good)',
    requiredPercent: 70,
    perSubjectTarget: 70,
    strategy: 'Very good understanding — focus on theory and application',
    difficultyProgression: ['intermediate', 'advanced', 'exam'],
    simulationFrequency: 'twice_weekly',
    minimumMasteryPerConcept: 70,
  },
  'C4': {
    label: 'WAEC C4 (Credit)',
    requiredPercent: 60,
    perSubjectTarget: 60,
    strategy: 'Credit-level mastery — ensure all core topics are covered',
    difficultyProgression: ['intermediate', 'advanced'],
    simulationFrequency: 'weekly',
    minimumMasteryPerConcept: 55,
  },
};

const NECO_TARGETS = {
  'A1': {
    label: 'NECO A1 (Excellent)',
    requiredPercent: 75,
    perSubjectTarget: 75,
    strategy: 'Excellent mastery — strong theory and practical understanding',
    difficultyProgression: ['advanced', 'exam'],
    simulationFrequency: 'twice_weekly',
    minimumMasteryPerConcept: 80,
  },
  'C4': {
    label: 'NECO C4 (Credit)',
    requiredPercent: 60,
    perSubjectTarget: 60,
    strategy: 'Credit-level mastery — focus on frequently tested areas',
    difficultyProgression: ['intermediate', 'advanced'],
    simulationFrequency: 'weekly',
    minimumMasteryPerConcept: 55,
  },
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Parse a student's target string into a structured target
 * e.g., "JAMB 380" → JAMB target with 380+ band
 * e.g., "WAEC A1" → WAEC target with A1 grade
 */
export function parseTarget(targetString) {
  const str = targetString.toUpperCase().trim();

  // JAMB targets
  const jambMatch = str.match(/JAMB\s*(\d+)/);
  if (jambMatch) {
    const score = parseInt(jambMatch[1]);
    // Find the closest target band
    const bandScores = Object.keys(JAMB_TARGETS).map(Number).sort((a, b) => b - a);
    const matchedBand = bandScores.find(b => score >= b) || 200;
    return {
      exam: 'JAMB',
      targetScore: score,
      band: JAMB_TARGETS[matchedBand],
      type: 'score',
    };
  }

  // WAEC targets
  const waecGradeMatch = str.match(/WAEC\s*([A-F]\d?)/i);
  if (waecGradeMatch) {
    const grade = waecGradeMatch[1].toUpperCase();
    const target = WAEC_TARGETS[grade] || WAEC_TARGETS['C4'];
    return {
      exam: 'WAEC',
      targetGrade: grade,
      band: target,
      type: 'grade',
    };
  }

  // NECO targets
  const necoGradeMatch = str.match(/NECO\s*([A-F]\d?)/i);
  if (necoGradeMatch) {
    const grade = necoGradeMatch[1].toUpperCase();
    const target = NECO_TARGETS[grade] || NECO_TARGETS['C4'];
    return {
      exam: 'NECO',
      targetGrade: grade,
      band: target,
      type: 'grade',
    };
  }

  // Generic exam mention without specific target
  if (str.includes('JAMB')) {
    return { exam: 'JAMB', targetScore: null, band: JAMB_TARGETS[200], type: 'generic' };
  }
  if (str.includes('WAEC')) {
    return { exam: 'WAEC', targetGrade: null, band: WAEC_TARGETS['C4'], type: 'generic' };
  }
  if (str.includes('NECO')) {
    return { exam: 'NECO', targetGrade: null, band: NECO_TARGETS['C4'], type: 'generic' };
  }

  return null;
}

/**
 * Build a comprehensive student progress report for their target
 */
export function buildTargetProgress(target, records, mistakes, selectedSubjects = []) {
  if (!target) return null;

  const exam = target.exam;
  const band = target.band;
  const examInfo = EXAMS[exam];
  if (!examInfo) return null;

  // Determine subjects to track
  const subjects = selectedSubjects.length > 0
    ? selectedSubjects
    : examInfo.subjects.slice(0, exam === 'JAMB' ? 4 : examInfo.subjects.length);

  // Per-subject analysis
  const subjectProgress = subjects.map(subject => {
    const subjectRecords = records.filter(r => r.exam === exam && r.subject === subject);
    const subjectMistakes = mistakes.filter(m => {
      // Try to match mistakes to subjects via concept
      return subjectRecords.some(r => r.concept === m.concept);
    });

    const coverage = getSyllabusCoverage(exam, subject, records);

    const avgMastery = subjectRecords.length
      ? Math.round(subjectRecords.reduce((sum, r) => sum + (r.mastery_score || 0), 0) / subjectRecords.length)
      : 0;

    const avgScore = subjectRecords.filter(r => r.last_score > 0).length
      ? Math.round(
          subjectRecords.filter(r => r.last_score > 0)
            .reduce((sum, r) => sum + r.last_score, 0) /
          subjectRecords.filter(r => r.last_score > 0).length
        )
      : 0;

    const totalAttempts = subjectRecords.reduce((sum, r) => sum + (r.attempts || 0), 0);

    const masteredCount = subjectRecords.filter(r => r.status === 'mastered').length;
    const weakCount = subjectRecords.filter(r => r.status === 'needs_review').length;

    // Pattern analysis for this subject
    const patterns = {};
    subjectMistakes.forEach(m => {
      patterns[m.pattern] = (patterns[m.pattern] || 0) + 1;
    });
    const topPatterns = Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      subject,
      coverage,
      avgMastery,
      avgScore,
      totalAttempts,
      masteredCount,
      weakCount,
      conceptCount: subjectRecords.length,
      topMistakePatterns: topPatterns.map(([pattern, count]) => ({ pattern, count })),
      gap: band.perSubjectTarget - avgScore,
      meetsTarget: avgScore >= band.perSubjectTarget,
    };
  });

  // Overall stats
  const totalRecords = records.filter(r => r.exam === exam);
  const overallAvgMastery = totalRecords.length
    ? Math.round(totalRecords.reduce((sum, r) => sum + (r.mastery_score || 0), 0) / totalRecords.length)
    : 0;

  const overallAvgScore = totalRecords.filter(r => r.last_score > 0).length
    ? Math.round(
        totalRecords.filter(r => r.last_score > 0)
          .reduce((sum, r) => sum + r.last_score, 0) /
        totalRecords.filter(r => r.last_score > 0).length
      )
    : 0;

  // Sort subjects by gap (biggest weakness first)
  const sortedByPriority = [...subjectProgress].sort((a, b) => b.gap - a.gap);

  return {
    exam,
    target: band,
    targetScore: target.targetScore,
    targetGrade: target.targetGrade,
    subjectProgress,
    overallAvgMastery,
    overallAvgScore,
    estimatedReadiness: estimateReadiness(target, subjectProgress),
    highestPrioritySubject: sortedByPriority[0] || null,
    subjectsMeetingTarget: subjectProgress.filter(s => s.meetsTarget).length,
    totalSubjects: subjectProgress.length,
  };
}

/**
 * Estimate readiness level based on current progress
 */
function estimateReadiness(target, subjectProgress) {
  if (!subjectProgress.length) return 'NOT_READY';

  const avgGap = subjectProgress.reduce((sum, s) => sum + Math.max(0, s.gap), 0) / subjectProgress.length;
  const subjectsMeeting = subjectProgress.filter(s => s.meetsTarget).length;
  const ratio = subjectsMeeting / subjectProgress.length;

  if (ratio >= 1.0 && avgGap <= 0) return 'TARGET_READY';
  if (ratio >= 0.8 && avgGap <= 5) return 'READY';
  if (ratio >= 0.5 && avgGap <= 15) return 'ALMOST_READY';
  if (ratio >= 0.2 || subjectProgress.some(s => s.avgMastery > 30)) return 'DEVELOPING';
  return 'NOT_READY';
}

/**
 * Get the recommended study plan phase based on target and progress
 */
export function getStudyPhase(target, progress) {
  if (!target || !progress) return 'foundation';

  const exam = target.exam;
  const readiness = progress.estimatedReadiness;

  if (exam === 'JAMB') {
    const targetScore = target.targetScore || 200;
    if (readiness === 'TARGET_READY') return 'simulation_refinement';
    if (readiness === 'READY') return 'exam_simulation';
    if (readiness === 'ALMOST_READY') return 'speed_training';
    if (readiness === 'DEVELOPING') return 'targeted_practice';
    return 'foundation';
  }

  // WAEC/NECO
  if (readiness === 'TARGET_READY') return 'simulation_refinement';
  if (readiness === 'READY') return 'theory_mastery';
  if (readiness === 'ALMOST_READY') return 'targeted_practice';
  return 'foundation';
}

/**
 * Get the recommended difficulty progression based on target and phase
 */
export function getDifficultyProgression(target, phase) {
  const band = target?.band;
  if (!band) return ['beginner', 'intermediate'];

  const progression = band.difficultyProgression || ['intermediate'];

  switch (phase) {
    case 'foundation': return ['beginner', 'intermediate'];
    case 'targeted_practice': return progression.slice(0, 2);
    case 'speed_training': return progression;
    case 'exam_simulation': return progression;
    case 'simulation_refinement': return ['challenge'];
    case 'theory_mastery': return progression;
    default: return progression;
  }
}

/**
 * Get the simulation frequency recommendation
 */
export function getSimulationFrequency(target, phase) {
  const band = target?.band;
  if (!band) return 'weekly';
  return band.simulationFrequency || 'weekly';
}

/**
 * Generate a study recommendation for the student
 * Returns the single most important next action
 */
export function getStudyRecommendation(target, progress) {
  if (!target || !progress) return null;

  const { highestPrioritySubject, subjectProgress, estimatedReadiness } = progress;

  // If no data yet, start with diagnostic
  if (!highestPrioritySubject || subjectProgress.every(s => s.conceptCount === 0)) {
    return {
      type: 'diagnostic',
      reason: 'No prior evidence — start with a diagnostic to map your strengths and weaknesses',
      subject: highestPrioritySubject?.subject,
    };
  }

  const phase = getStudyPhase(target, progress);

  switch (phase) {
    case 'foundation':
      // Focus on the weakest subject's basics
      return {
        type: 'lesson',
        reason: `${highestPrioritySubject.subject} has the biggest gap (${highestPrioritySubject.gap} points). Let's build the foundation.`,
        subject: highestPrioritySubject.subject,
        difficulty: 'beginner',
      };

    case 'targeted_practice':
      return {
        type: 'practice',
        reason: `You're developing well. Practice on ${highestPrioritySubject.subject} — focus on ${highestPrioritySubject.topMistakePatterns[0]?.pattern || 'core concepts'}.`,
        subject: highestPrioritySubject.subject,
        difficulty: 'intermediate',
      };

    case 'speed_training':
      return {
        type: 'quiz',
        reason: `Time to build speed. Quick quiz on ${highestPrioritySubject.subject} — see how fast you can work.`,
        subject: highestPrioritySubject.subject,
        duration: 600, // 10 minutes
      };

    case 'exam_simulation':
      return {
        type: 'exam',
        reason: `Full exam simulation — let's see where you stand.`,
        subject: highestPrioritySubject.subject,
      };

    case 'simulation_refinement':
      return {
        type: 'challenge',
        reason: `You're doing great. Let's push harder to build a safety margin.`,
        subject: highestPrioritySubject.subject,
      };

    case 'theory_mastery':
      return {
        type: 'lesson',
        reason: `Deep dive into ${highestPrioritySubject.subject} theory.`,
        subject: highestPrioritySubject.subject,
        difficulty: 'advanced',
      };

    default:
      return {
        type: 'lesson',
        reason: `Let's continue building your foundation.`,
        subject: highestPrioritySubject.subject,
      };
  }
}
