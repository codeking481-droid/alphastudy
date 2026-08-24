import { describe, it, expect } from 'vitest';

// ============================================================================
// Reasoning Checkpoint Selection Tests
// ============================================================================

describe('Reasoning Checkpoint Selection', () => {
  const sampleQuestion = {
    question_text: 'What is the derivative of x²?',
    options: ['2x', 'x²', '2', '2x²'],
    correct_index: 0,
    difficulty: 'intermediate',
    concept: 'Differentiation',
  };

  it('should require reasoning on first question', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const result = shouldAskReasoning(sampleQuestion, 0, { assessmentMode: 'practice' });
    expect(result.required).toBe(true);
    expect(result.priority).toMatch(/high|medium/);
  });

  it('should require reasoning on advanced questions', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const advancedQ = { ...sampleQuestion, difficulty: 'advanced' };
    const result = shouldAskReasoning(advancedQ, 5, { assessmentMode: 'practice' });
    expect(result.required).toBe(true);
  });

  it('should require reasoning on mid-assessment', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const result = shouldAskReasoning(sampleQuestion, 4, {
      assessmentMode: 'practice',
      questionCount: 8,
    });
    expect(result.required).toBe(true);
  });

  it('should require reasoning on suspiciously fast answers', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const result = shouldAskReasoning(sampleQuestion, 3, {
      assessmentMode: 'practice',
      suspiciousFastAnswer: true,
    });
    expect(result.required).toBe(true);
  });

  it('should require reasoning on answer changes', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const result = shouldAskReasoning(sampleQuestion, 3, {
      assessmentMode: 'practice',
      answerChangedCount: 2,
    });
    expect(result.required).toBe(true);
  });

  it('should require reasoning on weak mastery concepts', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const result = shouldAskReasoning(sampleQuestion, 3, {
      assessmentMode: 'practice',
      conceptMasteryLevel: 'needs_review',
    });
    expect(result.required).toBe(true);
  });

  it('should limit reasoning in strict exam mode', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    // Non-advanced question at non-midpoint in exam mode
    const result = shouldAskReasoning(sampleQuestion, 3, {
      assessmentMode: 'exam',
      questionCount: 20,
    });
    expect(result.required).toBe(false);
  });

  it('should still ask reasoning on advanced questions in exam mode', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const advancedQ = { ...sampleQuestion, difficulty: 'advanced' };
    const result = shouldAskReasoning(advancedQ, 5, {
      assessmentMode: 'exam',
      questionCount: 20,
    });
    expect(result.required).toBe(true);
  });

  it('should ask more reasoning in diagnostic mode', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const result = shouldAskReasoning(sampleQuestion, 1, {
      assessmentMode: 'diagnostic',
      diagnosticPhase: true,
    });
    expect(result.required).toBe(true);
  });

  it('should ask reasoning on consecutive correct answers', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const previousAnswers = {
      0: { selected: 0, correct: true, reasoning: 'Because...' },
      1: { selected: 0, correct: true, reasoning: 'I used...' },
      2: { selected: 0, correct: true, reasoning: 'The formula...' },
    };
    const result = shouldAskReasoning(sampleQuestion, 3, {
      assessmentMode: 'practice',
      previousAnswers,
    });
    expect(result.required).toBe(true);
  });
});

// ============================================================================
// Reasoning Categorization Tests
// ============================================================================

describe('Reasoning Categorization', () => {
  const question = {
    question_text: 'What is the derivative of x²?',
    options: ['2x', 'x²', '2', '2x²'],
    correct_index: 0,
    concept: 'Differentiation',
  };

  it('should categorize strong reasoning for correct answer', async () => {
    const { analyzeReasoning } = await import('../../src/lib/reasoning.js');
    const result = analyzeReasoning({
      transcript: 'Because the power rule says I bring down the exponent and subtract one, so x² becomes 2x.',
      question,
      selectedAnswer: 0,
      correctAnswer: 0,
      isCorrect: true,
    });
    expect(result.category.key).toBe('strong');
    expect(result.evidenceStrength).toBe('strong');
  });

  it('should categorize partial reasoning for correct answer', async () => {
    const { analyzeReasoning } = await import('../../src/lib/reasoning.js');
    const result = analyzeReasoning({
      transcript: 'I think it is this one because I remember seeing it somewhere.',
      question,
      selectedAnswer: 0,
      correctAnswer: 0,
      isCorrect: true,
    });
    expect(['partial', 'strong']).toContain(result.category.key);
  });

  it('should categorize guess for correct answer without reasoning', async () => {
    const { analyzeReasoning } = await import('../../src/lib/reasoning.js');
    const result = analyzeReasoning({
      transcript: 'I just picked it.',
      question,
      selectedAnswer: 0,
      correctAnswer: 0,
      isCorrect: true,
    });
    expect(result.category.key).toBe('guess');
  });

  it('should categorize misconception for wrong answer', async () => {
    const { analyzeReasoning } = await import('../../src/lib/reasoning.js');
    const result = analyzeReasoning({
      transcript: 'The derivative of x squared is always 2 because you just subtract the exponent.',
      question,
      selectedAnswer: 2,
      correctAnswer: 0,
      isCorrect: false,
    });
    expect(result.category.key).toBe('misconception');
    expect(result.evidenceStrength).toMatch(/strong|moderate/);
  });

  it('should categorize no reasoning when empty', async () => {
    const { analyzeReasoning } = await import('../../src/lib/reasoning.js');
    const result = analyzeReasoning({
      transcript: '',
      question,
      selectedAnswer: 0,
      correctAnswer: 0,
      isCorrect: true,
    });
    expect(result.category.key).toBe('guess');
    expect(result.evidenceStrength).toBe('none');
  });

  it('should categorize uncertainty expression', async () => {
    const { analyzeReasoning } = await import('../../src/lib/reasoning.js');
    const result = analyzeReasoning({
      transcript: 'I am not sure, maybe it is 2x but I am uncertain.',
      question,
      selectedAnswer: 0,
      correctAnswer: 0,
      isCorrect: true,
    });
    expect(result.category.key).toBe('uncertainty');
  });

  it('should categorize "I don\'t know"', async () => {
    const { analyzeReasoning } = await import('../../src/lib/reasoning.js');
    const result = analyzeReasoning({
      transcript: "I don't know.",
      question,
      selectedAnswer: 2,
      correctAnswer: 0,
      isCorrect: false,
    });
    expect(result.category.key).toBe('no_reasoning');
    expect(result.evidenceStrength).toBe('none');
  });

  it('should detect sound method with execution error', async () => {
    const { analyzeReasoning } = await import('../../src/lib/reasoning.js');
    const result = analyzeReasoning({
      transcript: 'I used the power rule correctly, bring down the exponent, but I made a mistake in the calculation and got 2.',
      question,
      selectedAnswer: 2,
      correctAnswer: 0,
      isCorrect: false,
    });
    // Should detect the method is right but execution was wrong
    expect(result.signals).toContain('execution_gap_detected');
  });
});

// ============================================================================
// Batch Analysis Tests
// ============================================================================

describe('Batch Reasoning Analysis', () => {
  it('should analyze all reasoning transcripts', async () => {
    const { analyzeAllReasoning } = await import('../../src/lib/reasoning.js');
    const questionResults = [
      {
        questionIndex: 0,
        question: { question_text: 'Q1', options: ['A', 'B'], correct_index: 0, concept: 'Math' },
        reasoning: 'Because the formula says so.',
        selectedAnswer: 0,
        correctAnswer: 0,
        isCorrect: true,
        reasoningRequired: true,
      },
      {
        questionIndex: 1,
        question: { question_text: 'Q2', options: ['A', 'B'], correct_index: 0, concept: 'Math' },
        reasoning: '',
        selectedAnswer: 1,
        correctAnswer: 0,
        isCorrect: false,
        reasoningRequired: true,
      },
      {
        questionIndex: 2,
        question: { question_text: 'Q3', options: ['A', 'B'], correct_index: 0, concept: 'Math' },
        reasoning: 'I calculated step by step using the derivative rule.',
        selectedAnswer: 0,
        correctAnswer: 0,
        isCorrect: true,
        reasoningRequired: true,
      },
    ];

    const result = analyzeAllReasoning(questionResults);
    expect(result.totalReasoningRequired).toBe(3);
    expect(result.totalReasoningProvided).toBe(3);
    expect(result.strongReasoningCount).toBeGreaterThanOrEqual(1);
    expect(result.understandingLevel).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('should handle no reasoning data', async () => {
    const { analyzeAllReasoning } = await import('../../src/lib/reasoning.js');
    const result = analyzeAllReasoning([]);
    expect(result.totalReasoningRequired).toBe(0);
    expect(result.reasoningScore).toBeNull();
  });
});

// ============================================================================
// Mastery Multiplier Tests
// ============================================================================

describe('Reasoning Mastery Multiplier', () => {
  it('should boost mastery for strong reasoning', async () => {
    const { getReasoningMasteryMultiplier } = await import('../../src/lib/reasoning.js');
    const multiplier = getReasoningMasteryMultiplier({
      totalReasoningRequired: 5,
      understandingLevel: 'demonstrated',
      misconceptionCount: 0,
      guessCount: 0,
    });
    expect(multiplier).toBeGreaterThan(1.0);
  });

  it('should reduce mastery for weak reasoning', async () => {
    const { getReasoningMasteryMultiplier } = await import('../../src/lib/reasoning.js');
    const multiplier = getReasoningMasteryMultiplier({
      totalReasoningRequired: 5,
      understandingLevel: 'uncertain',
      misconceptionCount: 2,
      guessCount: 1,
    });
    expect(multiplier).toBeLessThan(1.0);
  });

  it('should be neutral when no reasoning data', async () => {
    const { getReasoningMasteryMultiplier } = await import('../../src/lib/reasoning.js');
    const multiplier = getReasoningMasteryMultiplier(null);
    expect(multiplier).toBe(1.0);
  });

  it('should be neutral when no reasoning was required', async () => {
    const { getReasoningMasteryMultiplier } = await import('../../src/lib/reasoning.js');
    const multiplier = getReasoningMasteryMultiplier({ totalReasoningRequired: 0 });
    expect(multiplier).toBe(1.0);
  });
});

// ============================================================================
// Assessment Mode Tests
// ============================================================================

describe('Assessment Modes', () => {
  const q = {
    question_text: 'Test question',
    options: ['A', 'B'],
    correct_index: 0,
    difficulty: 'intermediate',
    concept: 'Test',
  };

  it('should allow flexible reasoning in practice mode', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    // First question always asks
    const result = shouldAskReasoning(q, 0, { assessmentMode: 'practice', questionCount: 8 });
    expect(result.required).toBe(true);
  });

  it('should be strict in mastery_check mode', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const result = shouldAskReasoning(q, 3, {
      assessmentMode: 'mastery_check',
      questionCount: 12,
    });
    // Non-advanced, non-midpoint → no reasoning in strict mode
    expect(result.required).toBe(false);
  });

  it('should gather deep evidence in diagnostic mode', async () => {
    const { shouldAskReasoning } = await import('../../src/lib/reasoning.js');
    const result = shouldAskReasoning(q, 1, {
      assessmentMode: 'diagnostic',
      diagnosticPhase: true,
    });
    expect(result.required).toBe(true);
  });
});
