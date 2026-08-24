import { describe, it, expect } from 'vitest';

// ============================================================================
// Curriculum Tests
// ============================================================================

describe('Curriculum Module', () => {
  // We test the client-side curriculum module by importing it directly.
  // Since it's pure logic, we can validate its structure.

  it('should define JAMB exam with correct structure', async () => {
    const { EXAMS } = await import('../../src/lib/curriculum.js');
    expect(EXAMS.JAMB).toBeDefined();
    expect(EXAMS.JAMB.code).toBe('JAMB');
    expect(EXAMS.JAMB.maxScore).toBe(400);
    expect(EXAMS.JAMB.subjects.length).toBeGreaterThan(0);
    expect(EXAMS.JAMB.targetBands).toBeDefined();
    expect(EXAMS.JAMB.targetBands.length).toBe(5);
  });

  it('should define WAEC exam with grade scale', async () => {
    const { EXAMS } = await import('../../src/lib/curriculum.js');
    expect(EXAMS.WAEC).toBeDefined();
    expect(EXAMS.WAEC.gradeScale).toBeDefined();
    expect(EXAMS.WAEC.gradeScale[0].grade).toBe('A1');
    expect(EXAMS.WAEC.gradeScale[0].minPercent).toBe(75);
  });

  it('should define NECO exam', async () => {
    const { EXAMS } = await import('../../src/lib/curriculum.js');
    expect(EXAMS.NECO).toBeDefined();
    expect(EXAMS.NECO.code).toBe('NECO');
  });

  it('should get concepts for a subject', async () => {
    const { getConceptsForSubject } = await import('../../src/lib/curriculum.js');
    const concepts = getConceptsForSubject('JAMB', 'Mathematics');
    expect(concepts.length).toBeGreaterThan(0);
    expect(concepts[0]).toHaveProperty('name');
    expect(concepts[0]).toHaveProperty('topic');
    expect(concepts[0]).toHaveProperty('subject', 'Mathematics');
    expect(concepts[0]).toHaveProperty('exam', 'JAMB');
  });

  it('should get prerequisites for a concept', async () => {
    const { getPrerequisites } = await import('../../src/lib/curriculum.js');
    const prereqs = getPrerequisites('JAMB', 'Mathematics', 'Polynomials');
    expect(prereqs.length).toBeGreaterThan(0);
    expect(prereqs[0]).toHaveProperty('name');
  });

  it('should return empty prerequisites for foundational concepts', async () => {
    const { getPrerequisites } = await import('../../src/lib/curriculum.js');
    const prereqs = getPrerequisites('JAMB', 'Mathematics', 'Number bases');
    expect(prereqs.length).toBe(0);
  });

  it('should get subjects for an exam', async () => {
    const { getSubjectsForExam } = await import('../../src/lib/curriculum.js');
    const subjects = getSubjectsForExam('JAMB');
    expect(subjects).toContain('Mathematics');
    expect(subjects).toContain('Physics');
    expect(subjects).toContain('Use of English');
  });

  it('should get syllabus coverage', async () => {
    const { getSyllabusCoverage } = await import('../../src/lib/curriculum.js');
    const coverage = getSyllabusCoverage('JAMB', 'Mathematics', []);
    expect(coverage.total).toBeGreaterThan(0);
    expect(coverage.covered).toBe(0);
    expect(coverage.percent).toBe(0);
  });

  it('should calculate coverage with records', async () => {
    const { getSyllabusCoverage } = await import('../../src/lib/curriculum.js');
    const records = [
      { concept: 'Number bases', exam: 'JAMB', subject: 'Mathematics', status: 'mastered' },
      { concept: 'Polynomials', exam: 'JAMB', subject: 'Mathematics', status: 'learning' },
    ];
    const coverage = getSyllabusCoverage('JAMB', 'Mathematics', records);
    expect(coverage.covered).toBe(2);
    expect(coverage.mastered).toBe(1);
    expect(coverage.percent).toBeGreaterThan(0);
  });

  it('should get JAMB band label', async () => {
    const { getJambBandLabel } = await import('../../src/lib/curriculum.js');
    expect(getJambBandLabel(380)).toBe('380+');
    expect(getJambBandLabel(300)).toBe('300+');
    expect(getJambBandLabel(250)).toBe('250+');
    expect(getJambBandLabel(200)).toBe('200+');
    expect(getJambBandLabel(150)).toBe('< 200');
  });

  it('should get WAEC grade from score', async () => {
    const { getGrade } = await import('../../src/lib/curriculum.js');
    const grade80 = getGrade('WAEC', 80);
    expect(grade80?.grade).toBe('A1');
    const grade55 = getGrade('WAEC', 55);
    expect(grade55?.grade).toBe('C5');
    const grade30 = getGrade('WAEC', 30);
    expect(grade30?.grade).toBe('F9');
  });

  it('should get exam info', async () => {
    const { getExamInfo } = await import('../../src/lib/curriculum.js');
    expect(getExamInfo('JAMB')).toBeDefined();
    expect(getExamInfo('INVALID')).toBeNull();
  });
});

// ============================================================================
// Target Score Tests
// ============================================================================

describe('Target Score Module', () => {
  it('should parse JAMB target with score', async () => {
    const { parseTarget } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('JAMB 380');
    expect(target).toBeDefined();
    expect(target?.exam).toBe('JAMB');
    expect(target?.targetScore).toBe(380);
    expect(target?.band?.label).toBe('JAMB 380+');
    expect(target?.band?.perSubjectTarget).toBe(95);
  });

  it('should parse JAMB 250 target', async () => {
    const { parseTarget } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('JAMB 250');
    expect(target?.targetScore).toBe(250);
    expect(target?.band?.perSubjectTarget).toBe(63);
  });

  it('should parse WAEC A1 target', async () => {
    const { parseTarget } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('WAEC A1');
    expect(target?.exam).toBe('WAEC');
    expect(target?.targetGrade).toBe('A1');
    expect(target?.band?.perSubjectTarget).toBe(75);
  });

  it('should parse NECO C4 target', async () => {
    const { parseTarget } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('NECO C4');
    expect(target?.exam).toBe('NECO');
    expect(target?.targetGrade).toBe('C4');
  });

  it('should parse generic JAMB mention', async () => {
    const { parseTarget } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('I want to prepare for JAMB');
    expect(target?.exam).toBe('JAMB');
    expect(target?.type).toBe('generic');
  });

  it('should return null for unrecognized target', async () => {
    const { parseTarget } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('I like pizza');
    expect(target).toBeNull();
  });

  it('should build target progress', async () => {
    const { parseTarget, buildTargetProgress } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('JAMB 300');
    const records = [
      { concept: 'Polynomials', exam: 'JAMB', subject: 'Mathematics', status: 'learning', mastery_score: 45, last_score: 60, attempts: 5 },
      { concept: 'Motion', exam: 'JAMB', subject: 'Physics', status: 'practiced', mastery_score: 65, last_score: 75, attempts: 8 },
    ];
    const mistakes = [];
    const progress = buildTargetProgress(target, records, mistakes, ['Mathematics', 'Physics']);
    expect(progress).toBeDefined();
    expect(progress?.exam).toBe('JAMB');
    expect(progress?.subjectProgress.length).toBe(2);
    expect(progress?.highestPrioritySubject).toBeDefined();
  });

  it('should get study phase based on readiness', async () => {
    const { parseTarget, buildTargetProgress, getStudyPhase } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('JAMB 380');
    // No records = NOT_READY = foundation
    const progress = buildTargetProgress(target, [], [], ['Mathematics']);
    const phase = getStudyPhase(target, progress);
    expect(phase).toBe('foundation');
  });

  it('should get difficulty progression', async () => {
    const { parseTarget, getDifficultyProgression } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('JAMB 380');
    const progression = getDifficultyProgression(target, 'foundation');
    expect(progression).toContain('beginner');
    const advanced = getDifficultyProgression(target, 'exam_simulation');
    expect(advanced).toContain('challenge');
  });

  it('should generate study recommendation for empty student', async () => {
    const { parseTarget, buildTargetProgress, getStudyRecommendation } = await import('../../src/lib/targetScore.js');
    const target = parseTarget('JAMB 300');
    const progress = buildTargetProgress(target, [], [], ['Mathematics']);
    const rec = getStudyRecommendation(target, progress);
    expect(rec).toBeDefined();
    expect(rec?.type).toBe('diagnostic');
  });
});

// ============================================================================
// Diagnostic Tests
// ============================================================================

describe('Diagnostic Module', () => {
  it('should build diagnostic plan for JAMB', async () => {
    const { buildDiagnosticPlan } = await import('../../src/lib/diagnostic.js');
    const plan = buildDiagnosticPlan('JAMB', ['Mathematics', 'Physics']);
    expect(plan).toBeDefined();
    expect(plan.exam).toBe('JAMB');
    expect(plan.subjects.length).toBe(2);
    expect(plan.totalEstimatedQuestions).toBeGreaterThan(0);
  });

  it('should build diagnostic plan with existing records', async () => {
    const { buildDiagnosticPlan } = await import('../../src/lib/diagnostic.js');
    const records = [
      { concept: 'Polynomials', status: 'mastered', mastery_score: 90 },
    ];
    const plan = buildDiagnosticPlan('JAMB', ['Mathematics'], records);
    expect(plan.subjects.length).toBe(1);
    expect(plan.subjects[0].concepts.length).toBeGreaterThan(0);
  });

  it('should analyze diagnostic results', async () => {
    const { analyzeDiagnosticResults } = await import('../../src/lib/diagnostic.js');
    const results = [
      {
        concept: 'Polynomials',
        subject: 'Mathematics',
        result: { score: 80, correct: 2, total: 3, mistakes: [], perQuestionTimes: [30, 45, 60] },
      },
      {
        concept: 'Motion',
        subject: 'Physics',
        result: { score: 40, correct: 1, total: 3, mistakes: [{ pattern: 'concept_confusion' }], perQuestionTimes: [90, 120, 80] },
      },
    ];
    const analysis = analyzeDiagnosticResults(results);
    expect(analysis.strongConcepts.length).toBe(1);
    expect(analysis.weakConcepts.length).toBe(1);
    expect(analysis.overallReadiness).toBe(60);
    expect(analysis.recommendedFocus?.subject).toBe('Physics');
  });

  it('should generate diagnostic summary', async () => {
    const { analyzeDiagnosticResults, buildDiagnosticSummary } = await import('../../src/lib/diagnostic.js');
    const results = [
      { concept: 'Polynomials', subject: 'Mathematics', result: { score: 85, correct: 3, total: 3, mistakes: [] } },
    ];
    const analysis = analyzeDiagnosticResults(results);
    const summary = buildDiagnosticSummary(analysis);
    expect(summary).toContain('DIAGNOSTIC RESULTS');
    expect(summary).toContain('Mathematics');
  });
});

// ============================================================================
// Exam Autopsy Tests
// ============================================================================

describe('Exam Autopsy Module', () => {
  it('should perform full autopsy on exam results', async () => {
    const { performAutopsy } = await import('../../src/lib/examAutopsy.js');
    const config = { concept: 'Polynomials', subject: 'Mathematics', exam: 'JAMB', question_count: 8, duration_minutes: 10 };
    const result = {
      score: 63,
      correct: 5,
      total: 8,
      unanswered: 1,
      mistakes: [
        { question: { question_text: 'Solve x^2 + 3x + 2', concept: 'Polynomials' }, student: 1, correct: 0, pattern: 'sign_error' },
        { question: { question_text: 'Factorize x^2 - 4', concept: 'Polynomials' }, student: 2, correct: 0, pattern: 'formula_confusion' },
      ],
      perQuestionTimes: [30, 45, 60, 90, 35, 55, 80, 120],
      totalTime: 515,
      confidence: 3,
    };
    const prevRecord = { last_score: 50, attempts: 3, mastery_score: 40 };
    const autopsy = performAutopsy(config, result, prevRecord);
    expect(autopsy.score).toBe(63);
    expect(autopsy.correct).toBe(5);
    expect(autopsy.incorrect).toBe(2);
    expect(autopsy.unanswered).toBe(1);
    expect(autopsy.mistakeAnalysis.count).toBe(2);
    expect(autopsy.timeAnalysis.timed).toBe(true);
    expect(autopsy.confidenceAnalysis.measured).toBe(true);
    expect(autopsy.readiness).toBeDefined();
    expect(autopsy.nextAction).toBeDefined();
  });

  it('should handle perfect score', async () => {
    const { performAutopsy } = await import('../../src/lib/examAutopsy.js');
    const config = { concept: 'Polynomials', subject: 'Mathematics', exam: 'JAMB', question_count: 8 };
    const result = { score: 100, correct: 8, total: 8, unanswered: 0, mistakes: [], confidence: 5 };
    const autopsy = performAutopsy(config, result, null);
    expect(autopsy.score).toBe(100);
    expect(autopsy.mistakeAnalysis.count).toBe(0);
    expect(autopsy.readiness.level).toBeDefined();
  });

  it('should handle zero score', async () => {
    const { performAutopsy } = await import('../../src/lib/examAutopsy.js');
    const config = { concept: 'Polynomials', subject: 'Mathematics', exam: 'JAMB', question_count: 8 };
    const result = { score: 0, correct: 0, total: 8, unanswered: 3, mistakes: [
      { question: { question_text: 'Q1' }, student: 1, correct: 0 },
      { question: { question_text: 'Q2' }, student: 2, correct: 0 },
      { question: { question_text: 'Q3' }, student: 3, correct: 0 },
      { question: { question_text: 'Q4' }, student: 0, correct: 1 },
      { question: { question_text: 'Q5' }, student: 1, correct: 2 },
    ] };
    const autopsy = performAutopsy(config, result, null);
    expect(autopsy.score).toBe(0);
    // Score < 40 triggers lesson; critical patterns may trigger mistake_clinic first
    expect(['lesson', 'mistake_clinic']).toContain(autopsy.nextAction.type);
  });

  it('should build autopsy summary', async () => {
    const { performAutopsy, buildAutopsySummary } = await import('../../src/lib/examAutopsy.js');
    const config = { concept: 'Polynomials', subject: 'Mathematics', exam: 'JAMB', question_count: 8 };
    const result = { score: 75, correct: 6, total: 8, unanswered: 0, mistakes: [
      { question: { question_text: 'Q1' }, student: 1, correct: 0, pattern: 'sign_error' },
      { question: { question_text: 'Q2' }, student: 2, correct: 0, pattern: 'concept_confusion' },
    ], confidence: 4 };
    const autopsy = performAutopsy(config, result, null);
    const summary = buildAutopsySummary(autopsy);
    expect(summary).toContain('EXAM AUTOPSY');
    expect(summary).toContain('75%');
    expect(summary).toContain('sign_error');
  });
});

// ============================================================================
// Readiness Tests
// ============================================================================

describe('Readiness Module', () => {
  it('should return NOT_READY for null record', async () => {
    const { calculateReadiness } = await import('../../src/lib/readiness.js');
    const readiness = calculateReadiness(null);
    expect(readiness.level).toBe('NOT_READY');
  });

  it('should calculate readiness for basic record', async () => {
    const { calculateReadiness } = await import('../../src/lib/readiness.js');
    const record = { attempts: 3, correct: 2, mastery_score: 40, last_score: 60, streak: 1, concept: 'Polynomials' };
    const readiness = calculateReadiness(record);
    expect(readiness.level).toBeDefined();
    expect(readiness.score).toBeGreaterThanOrEqual(0);
    expect(readiness.factors).toBeDefined();
  });

  it('should calculate readiness for high-performing record', async () => {
    const { calculateReadiness } = await import('../../src/lib/readiness.js');
    const record = { attempts: 10, correct: 9, mastery_score: 85, last_score: 90, streak: 5, concept: 'Polynomials' };
    const readiness = calculateReadiness(record, [
      { score: 88 }, { score: 92 }, { score: 85 }, { score: 90 }, { score: 87 },
    ]);
    // Score should be positive and have all factors
    expect(readiness.score).toBeGreaterThan(0);
    expect(readiness.factors.mastery).toBeGreaterThan(0);
    expect(readiness.factors.consistency).toBeGreaterThan(0);
    expect(readiness.factors.volume).toBe(100);
    expect(readiness.explanation).toBeDefined();
  });

  it('should handle record with no attempts', async () => {
    const { calculateReadiness } = await import('../../src/lib/readiness.js');
    const record = { attempts: 0, correct: 0, mastery_score: 0, last_score: 0, streak: 0, concept: 'Polynomials' };
    const readiness = calculateReadiness(record);
    expect(readiness.level).toBe('NOT_READY');
  });

  it('should factor in target proximity', async () => {
    const { calculateReadiness } = await import('../../src/lib/readiness.js');
    const record = { attempts: 8, correct: 7, mastery_score: 80, last_score: 85, streak: 3, concept: 'Polynomials' };
    const target = { band: { perSubjectTarget: 75 } };
    const readiness = calculateReadiness(record, [{ score: 85 }, { score: 88 }], target);
    expect(readiness.factors.targetProximity).toBeGreaterThan(0);
  });

  it('should calculate exam readiness across subjects', async () => {
    const { calculateExamReadiness } = await import('../../src/lib/readiness.js');
    const records = [
      { concept: 'Polynomials', exam: 'JAMB', subject: 'Mathematics', attempts: 5, correct: 4, mastery_score: 70, last_score: 80, streak: 2 },
      { concept: 'Motion', exam: 'JAMB', subject: 'Physics', attempts: 3, correct: 2, mastery_score: 50, last_score: 65, streak: 1 },
    ];
    const subjectRecords = {
      Mathematics: records.filter(r => r.subject === 'Mathematics'),
      Physics: records.filter(r => r.subject === 'Physics'),
    };
    const readiness = calculateExamReadiness('JAMB', records, subjectRecords);
    expect(readiness.overallLevel).toBeDefined();
    expect(readiness.overallScore).toBeGreaterThan(0);
    expect(readiness.subjectReadiness.Mathematics).toBeDefined();
    expect(readiness.subjectReadiness.Physics).toBeDefined();
  });
});

// ============================================================================
// Mastery Module (existing, validate still works)
// ============================================================================

describe('Mastery Module', () => {
  it('should compute mastery score', async () => {
    const { computeMastery } = await import('../../src/lib/mastery.js');
    const record = { attempts: 10, correct: 8, streak: 3, last_score: 85 };
    const mastery = computeMastery(record);
    expect(mastery).toBeGreaterThan(0);
    expect(mastery).toBeLessThanOrEqual(100);
  });

  it('should return 0 for null record', async () => {
    const { computeMastery } = await import('../../src/lib/mastery.js');
    expect(computeMastery(null)).toBe(0);
  });

  it('should return 0 for zero attempts', async () => {
    const { computeMastery } = await import('../../src/lib/mastery.js');
    expect(computeMastery({ attempts: 0 })).toBe(0);
  });

  it('should detect mastered concept', async () => {
    const { isMastered } = await import('../../src/lib/mastery.js');
    const record = { attempts: 8, correct: 8, streak: 5, last_score: 95, mastery_score: 90, weak_patterns: [] };
    expect(isMastered(record)).toBe(true);
  });

  it('should not mark as mastered if weak patterns exist', async () => {
    const { isMastered } = await import('../../src/lib/mastery.js');
    const record = { attempts: 8, correct: 8, streak: 5, last_score: 95, mastery_score: 90, weak_patterns: ['sign_error'] };
    expect(isMastered(record)).toBe(false);
  });
});

// ============================================================================
// Assessment Module (existing, validate still works)
// ============================================================================

describe('Assessment Module', () => {
  it('should score attempt correctly', async () => {
    const { scoreAttempt } = await import('../../src/lib/assessment.js');
    const questions = [
      { correct_index: 0 },
      { correct_index: 1 },
      { correct_index: 2 },
      { correct_index: 3 },
    ];
    const answers = [0, 1, 2, 3];
    const result = scoreAttempt(questions, answers);
    expect(result.total).toBe(4);
    expect(result.correct).toBe(4);
    expect(result.score).toBe(100);
    expect(result.mistakes.length).toBe(0);
  });

  it('should handle partial correct', async () => {
    const { scoreAttempt } = await import('../../src/lib/assessment.js');
    const questions = [
      { correct_index: 0, question_text: 'Q1' },
      { correct_index: 1, question_text: 'Q2' },
      { correct_index: 2, question_text: 'Q3' },
      { correct_index: 3, question_text: 'Q4' },
    ];
    const answers = [0, 2, 2, 3];
    const result = scoreAttempt(questions, answers);
    expect(result.correct).toBe(3);
    expect(result.score).toBe(75);
    expect(result.mistakes.length).toBe(1);
  });

  it('should handle unanswered questions', async () => {
    const { scoreAttempt } = await import('../../src/lib/assessment.js');
    const questions = [
      { correct_index: 0, question_text: 'Q1' },
      { correct_index: 1, question_text: 'Q2' },
      { correct_index: 2, question_text: 'Q3' },
    ];
    const answers = [0, undefined, 2];
    const result = scoreAttempt(questions, answers);
    expect(result.correct).toBe(2);
    expect(result.unanswered).toBe(1);
  });
});
