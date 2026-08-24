// ============================================================================
// REASONING ENGINE — Determines when to ask for reasoning, analyzes responses
// ============================================================================
// The student should feel Alpha is watching their reasoning, not just counting
// correct answers. Not every question gets a reasoning checkpoint — the engine
// intelligently selects when deeper evidence is needed.
// ============================================================================

// ============================================================================
// REASONING CHECKPOINT DECISION
// ============================================================================

/**
 * Determine whether a reasoning checkpoint is required for this question.
 * Returns { required: boolean, reason: string, priority: 'high'|'medium'|'low' }
 */
export function shouldAskReasoning(question, questionIndex, context) {
  const {
    assessmentMode = 'practice',
    previousAnswers = {},      // { [questionIndex]: { selected, correct, reasoning } }
    questionCount = 8,
    studentHistory = [],       // recent reasoning transcripts for this concept
    suspiciousFastAnswer = false,
    answerChangedCount = 0,
    conceptMasteryLevel = null, // null, 'learning', 'practiced', 'mastered'
    diagnosticPhase = false,
  } = context || {};

  // In strict exam mode, reasoning is only used at key decision points
  if (assessmentMode === 'exam' || assessmentMode === 'mastery_check') {
    // Only ask reasoning on ~20% of questions in strict modes
    // Focus on high-difficulty and prerequisite questions
    if (question.difficulty === 'advanced' || question.difficulty === 'challenge') {
      return { required: true, reason: 'High-difficulty question in strict mode', priority: 'high' };
    }
    if (questionIndex === Math.floor(questionCount / 2)) {
      return { required: true, reason: 'Mid-assessment calibration check', priority: 'medium' };
    }
    return { required: false, reason: 'Strict mode — minimal interruption', priority: 'low' };
  }

  // Diagnostic mode: ask reasoning on more questions for deeper evidence
  if (assessmentMode === 'diagnostic') {
    if (diagnosticPhase) {
      return { required: true, reason: 'Diagnostic phase — gathering reasoning evidence', priority: 'high' };
    }
    // Always ask on first few questions to establish baseline
    if (questionIndex < 3) {
      return { required: true, reason: 'Early diagnostic — establishing reasoning baseline', priority: 'high' };
    }
  }

  // Practice mode: intelligent selection

  // Trigger 1: Suspiciously fast correct answer (possible guessing)
  if (suspiciousFastAnswer) {
    return { required: true, reason: 'Suspiciously fast answer — verifying understanding', priority: 'high' };
  }

  // Trigger 2: Answer changed multiple times (uncertainty)
  if (answerChangedCount >= 2) {
    return { required: true, reason: 'Answer changed multiple times — checking confidence', priority: 'medium' };
  }

  // Trigger 3: Question is a recurring mistake pattern
  if (question.difficulty === 'advanced' || question.difficulty === 'challenge') {
    return { required: true, reason: 'Advanced question — deeper evidence needed', priority: 'high' };
  }

  // Trigger 4: First question of the assessment
  if (questionIndex === 0) {
    return { required: true, reason: 'First question — establishing reasoning baseline', priority: 'medium' };
  }

  // Trigger 5: Mid-assessment check
  if (questionIndex === Math.floor(questionCount / 2)) {
    return { required: true, reason: 'Mid-assessment calibration', priority: 'medium' };
  }

  // Trigger 6: Student has weak mastery in this concept
  if (conceptMasteryLevel === 'needs_review' || conceptMasteryLevel === 'learning') {
    return { required: true, reason: 'Weak concept — verifying understanding', priority: 'medium' };
  }

  // Trigger 7: Student has been getting consecutive correct answers (verify it's real)
  const recentCorrect = countRecentCorrect(previousAnswers, questionIndex);
  if (recentCorrect >= 3) {
    return { required: true, reason: 'Consecutive correct — verifying sustained understanding', priority: 'low' };
  }

  // Trigger 8: About 1 in 4 regular questions gets a reasoning check
  if (questionIndex % 4 === 0) {
    return { required: true, reason: 'Periodic reasoning check', priority: 'low' };
  }

  return { required: false, reason: 'Normal flow — no reasoning checkpoint needed', priority: 'low' };
}

/**
 * Count consecutive correct answers before the current index
 */
function countRecentCorrect(previousAnswers, currentIndex) {
  let count = 0;
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (previousAnswers[i] && previousAnswers[i].correct) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ============================================================================
// REASONING CATEGORIZATION
// ============================================================================

/**
 * Categories of reasoning quality
 */
export const REASONING_CATEGORIES = {
  STRONG: {
    key: 'strong',
    label: 'Strong Reasoning',
    description: 'Correct answer with clear, accurate reasoning. Strong evidence of understanding.',
    effect: 'strengthens',
    masteryImpact: 0.15,
  },
  PARTIAL: {
    key: 'partial',
    label: 'Partial Understanding',
    description: 'Correct answer but reasoning has gaps or is incomplete.',
    effect: 'neutral',
    masteryImpact: 0.05,
  },
  GUESS: {
    key: 'guess',
    label: 'Possible Guess',
    description: 'Correct answer with no meaningful reasoning or unrelated explanation.',
    effect: 'weakens',
    masteryImpact: -0.1,
  },
  METHOD_RIGHT: {
    key: 'method_right',
    label: 'Sound Method, Execution Error',
    description: 'Wrong answer but the reasoning shows correct approach with a calculation or application mistake.',
    effect: 'partial_credit',
    masteryImpact: 0.05,
  },
  MISCONCEPTION: {
    key: 'misconception',
    label: 'Misconception Detected',
    description: 'Wrong answer with reasoning that reveals a fundamental misunderstanding.',
    effect: 'weakens',
    masteryImpact: -0.2,
  },
  NO_REASONING: {
    key: 'no_reasoning',
    label: 'No Reasoning Provided',
    description: 'Student could not or would not explain their reasoning.',
    effect: 'uncertain',
    masteryImpact: -0.05,
  },
  UNCERTAINTY: {
    key: 'uncertainty',
    label: 'Student Expressed Uncertainty',
    description: 'Student indicated they were not sure. Honest but indicates fragile knowledge.',
    effect: 'uncertain',
    masteryImpact: -0.05,
  },
};

/**
 * Analyze a reasoning transcript and categorize it
 * @param {Object} params
 * @param {string} params.transcript - The student's reasoning text
 * @param {Object} params.question - The question object
 * @param {number} params.selectedAnswer - The student's selected answer index
 * @param {number} params.correctAnswer - The correct answer index
 * @param {boolean} params.isCorrect - Whether the answer is correct
 * @returns {Object} reasoning analysis
 */
export function analyzeReasoning({ transcript, question, selectedAnswer, correctAnswer, isCorrect }) {
  if (!transcript || transcript.trim().length === 0) {
    return categorizeNoReasoning(isCorrect);
  }

  const text = transcript.toLowerCase().trim();

  // Check for uncertainty expressions
  if (isUncertain(text)) {
    return {
      category: REASONING_CATEGORIES.UNCERTAINTY,
      confidence: 0.9,
      summary: 'Student expressed uncertainty about their answer.',
      transcript,
      evidenceStrength: 'weak',
    };
  }

  // Check for "I don't know"
  if (isDontKnow(text)) {
    return {
      category: REASONING_CATEGORIES.NO_REASONING,
      confidence: 0.95,
      summary: 'Student indicated they do not know.',
      transcript,
      evidenceStrength: 'none',
    };
  }

  // Analyze the reasoning content
  const analysis = extractReasoningSignals(text, question);

  if (isCorrect) {
    // Correct answer — now check reasoning quality
    if (analysis.hasCorrectLogic && analysis.specificTerms) {
      return {
        category: REASONING_CATEGORIES.STRONG,
        confidence: analysis.confidence,
        summary: `Correct answer with sound reasoning. ${analysis.evidenceSummary}`,
        transcript,
        evidenceStrength: 'strong',
        signals: analysis.signals,
      };
    }

    if (analysis.hasCorrectLogic || analysis.hasSomeRelevance) {
      return {
        category: REASONING_CATEGORIES.PARTIAL,
        confidence: analysis.confidence * 0.8,
        summary: `Correct answer but reasoning could be more precise. ${analysis.evidenceSummary}`,
        transcript,
        evidenceStrength: 'moderate',
        signals: analysis.signals,
      };
    }

    // Correct but no meaningful reasoning
    return {
      category: REASONING_CATEGORIES.GUESS,
      confidence: 0.7,
      summary: 'Correct answer but reasoning does not demonstrate understanding.',
      transcript,
      evidenceStrength: 'weak',
      signals: analysis.signals,
    };
  } else {
    // Wrong answer — check if reasoning shows correct method
    if (analysis.hasCorrectLogic && analysis.hasExecutionGap) {
      return {
        category: REASONING_CATEGORIES.METHOD_RIGHT,
        confidence: analysis.confidence,
        summary: `Sound approach but execution error. ${analysis.evidenceSummary}`,
        transcript,
        evidenceStrength: 'moderate',
        signals: analysis.signals,
      };
    }

    if (analysis.showsMisconception) {
      return {
        category: REASONING_CATEGORIES.MISCONCEPTION,
        confidence: analysis.confidence,
        summary: `Reasoning reveals a misconception. ${analysis.evidenceSummary}`,
        transcript,
        evidenceStrength: 'strong',
        signals: analysis.signals,
      };
    }

    // Wrong answer with some reasoning
    return {
      category: REASONING_CATEGORIES.MISCONCEPTION,
      confidence: analysis.confidence * 0.7,
      summary: 'Wrong answer with reasoning that does not match the correct approach.',
      transcript,
      evidenceStrength: 'moderate',
      signals: analysis.signals,
    };
  }
}

// ============================================================================
// REASONING SIGNAL EXTRACTION
// ============================================================================

/**
 * Extract signals from reasoning text to determine quality and category
 */
function extractReasoningSignals(text, question) {
  const signals = [];
  let confidence = 0.5;
  let hasCorrectLogic = false;
  let hasSomeRelevance = false;
  let hasExecutionGap = false;
  let showsMisconception = false;
  let specificTerms = false;

  const correctText = (question.options?.[question.correct_index] || '').toLowerCase();
  const selectedText = (question.options?.[question.selected_answer] || '').toLowerCase();

  // Signal 1: References the correct answer or concept
  if (correctText && text.includes(correctText.substring(0, 10))) {
    hasCorrectLogic = true;
    specificTerms = true;
    signals.push('references_correct_answer');
    confidence += 0.2;
  }

  // Signal 2: References the question concept
  const conceptWords = (question.concept || '').toLowerCase().split(/\s+/);
  const conceptMentioned = conceptWords.filter(w => w.length > 3 && text.includes(w));
  if (conceptMentioned.length > 0) {
    hasSomeRelevance = true;
    specificTerms = true;
    signals.push(`mentions_concept: ${conceptMentioned.join(', ')}`);
    confidence += 0.1;
  }

  // Signal 3: Uses reasoning connectors (because, therefore, since, etc.)
  const reasoningConnectors = ['because', 'therefore', 'since', 'so', 'this means', 'which means', 'reason is', 'the answer is'];
  const connectorCount = reasoningConnectors.filter(c => text.includes(c)).length;
  if (connectorCount > 0) {
    hasCorrectLogic = true;
    signals.push(`uses_reasoning_connectors(${connectorCount})`);
    confidence += 0.1;
  }

  // Signal 4: Mentions specific values, formulas, or calculations
  const hasNumbers = /\d+/.test(text);
  const hasFormulas = /[=+\-*/^]/.test(text) || /formula|equation|calculate|compute/.test(text);
  if (hasNumbers || hasFormulas) {
    specificTerms = true;
    signals.push('references_specifics');
    confidence += 0.1;
  }

  // Signal 5: Uses domain-specific vocabulary
  const domainTerms = extractDomainTerms(text);
  if (domainTerms.length > 0) {
    specificTerms = true;
    signals.push(`domain_terms: ${domainTerms.join(', ')}`);
    confidence += 0.1;
  }

  // Signal 6: Vague or generic response
  const vaguePatterns = ['i think', 'i guess', 'i feel like', 'seems like', 'maybe', 'probably', 'not sure'];
  const vagueCount = vaguePatterns.filter(p => text.includes(p)).length;
  if (vagueCount > 0) {
    signals.push(`vague_expressions(${vagueCount})`);
    confidence -= 0.15;
  }

  // Signal 7: Very short response (potential lazy/guess reasoning)
  if (text.length < 20) {
    signals.push('very_short_response');
    confidence -= 0.2;
  }

  // Signal 8: Explains why wrong answer is wrong (shows deeper understanding)
  if (text.includes('not') && (text.includes('because') || text.includes('but'))) {
    hasCorrectLogic = true;
    signals.push('elimination_reasoning');
    confidence += 0.15;
  }

  // Signal 9: Execution gap detection (mentions correct concept but arrives at wrong answer)
  if (hasCorrectLogic && text.includes('but') || text.includes('however') || text.includes('mistake')) {
    hasExecutionGap = true;
    signals.push('execution_gap_detected');
  }

  // Signal 10: Misconception indicators
  const misconceptionIndicators = ['always', 'never', 'all', 'every', 'none'];
  const strongAbsolutes = misconceptionIndicators.filter(w => {
    const regex = new RegExp(`\\b${w}\\b`);
    return regex.test(text);
  });
  if (strongAbsolutes.length > 0 && !hasCorrectLogic) {
    showsMisconception = true;
    signals.push(`strong_absolutes: ${strongAbsolutes.join(', ')}`);
  }

  // Clamp confidence
  confidence = Math.max(0.1, Math.min(1.0, confidence));

  const evidenceSummary = signals.length > 0
    ? `Signals: ${signals.slice(0, 3).join('; ')}`
    : 'No strong signals detected';

  return {
    signals,
    confidence,
    hasCorrectLogic,
    hasSomeRelevance,
    hasExecutionGap,
    showsMisconception,
    specificTerms,
    evidenceSummary,
  };
}

/**
 * Check if the student expressed uncertainty
 */
function isUncertain(text) {
  const patterns = [
    /\bnot sure\b/, /\buncertain\b/, /\bmaybe\b/, /\bi think maybe\b/,
    /\bprobably\b/, /\bcould be\b/, /\bmight be\b/, /\bi guess\b/,
    /\bnot confident\b/, /\bdon't really know\b/, /\bhard to say\b/,
  ];
  return patterns.some(p => p.test(text));
}

/**
 * Check if the student said they don't know
 */
function isDontKnow(text) {
  const patterns = [
    /\bi don'?t know\b/, /\bno idea\b/, /\bno clue\b/, /\bi can'?t answer\b/,
    /\bnot sure at all\b/, /\bcompletely lost\b/, /\bhave no idea\b/,
  ];
  return patterns.some(p => p.test(text));
}

/**
 * Categorize when no reasoning was provided
 */
function categorizeNoReasoning(isCorrect) {
  return {
    category: isCorrect ? REASONING_CATEGORIES.GUESS : REASONING_CATEGORIES.NO_REASONING,
    confidence: 0.6,
    summary: isCorrect
      ? 'Correct answer but no reasoning provided — possible guessing.'
      : 'No reasoning provided for incorrect answer.',
    transcript: '',
    evidenceStrength: 'none',
    signals: ['no_reasoning'],
  };
}

/**
 * Extract domain-specific terms from text
 */
function extractDomainTerms(text) {
  // Common academic terms across subjects
  const terms = [
    'velocity', 'acceleration', 'momentum', 'force', 'energy',
    'equation', 'formula', 'variable', 'coefficient', 'polynomial',
    'photosynthesis', 'mitosis', 'meiosis', 'cell', 'organism',
    'supply', 'demand', 'inflation', 'gdp', 'market',
    'verb', 'noun', 'adjective', 'metaphor', 'simile',
    'hypothesis', 'experiment', 'theory', 'result',
    'atomic', 'molecular', 'compound', 'element', 'reaction',
  ];
  return terms.filter(t => text.includes(t));
}

// ============================================================================
// BATCH REASONING ANALYSIS
// ============================================================================

/**
 * Analyze all reasoning transcripts from an assessment
 * @param {Array} questionResults - Array of question result objects
 * @returns {Object} aggregated reasoning analysis
 */
export function analyzeAllReasoning(questionResults) {
  const categories = {};
  let totalReasoningRequired = 0;
  let totalReasoningProvided = 0;
  let strongReasoningCount = 0;
  let misconceptionCount = 0;
  let guessCount = 0;
  const reasoningDetails = [];

  for (const qr of questionResults) {
    if (!qr.reasoningRequired) continue;
    totalReasoningRequired++;

    if (!qr.reasoning || qr.reasoning.trim().length === 0) {
      totalReasoningProvided++;
      const analysis = categorizeNoReasoning(qr.isCorrect);
      reasoningDetails.push({
        questionIndex: qr.questionIndex,
        analysis,
        selectedAnswer: qr.selectedAnswer,
        correctAnswer: qr.correctAnswer,
      });
      continue;
    }

    totalReasoningProvided++;
    const analysis = analyzeReasoning({
      transcript: qr.reasoning,
      question: qr.question,
      selectedAnswer: qr.selectedAnswer,
      correctAnswer: qr.correctAnswer,
      isCorrect: qr.isCorrect,
    });

    if (analysis.category.key === 'strong' || analysis.category.key === 'partial') {
      strongReasoningCount++;
    }
    if (analysis.category.key === 'misconception') {
      misconceptionCount++;
    }
    if (analysis.category.key === 'guess') {
      guessCount++;
    }

    reasoningDetails.push({
      questionIndex: qr.questionIndex,
      analysis,
      selectedAnswer: qr.selectedAnswer,
      correctAnswer: qr.correctAnswer,
    });
  }

  // Overall reasoning quality score (0-100)
  const reasoningScore = totalReasoningRequired > 0
    ? Math.round(
        (strongReasoningCount / totalReasoningRequired) * 100 -
        (misconceptionCount / totalReasoningRequired) * 30 -
        (guessCount / totalReasoningRequired) * 20
      )
    : null;

  // Determine understanding level
  let understandingLevel = 'unknown';
  if (reasoningScore !== null) {
    if (reasoningScore >= 75) understandingLevel = 'demonstrated';
    else if (reasoningScore >= 50) understandingLevel = 'partial';
    else if (reasoningScore >= 25) understandingLevel = 'fragile';
    else understandingLevel = 'uncertain';
  }

  return {
    totalReasoningRequired,
    totalReasoningProvided,
    reasoningCompletionRate: totalReasoningRequired > 0
      ? Math.round((totalReasoningProvided / totalReasoningRequired) * 100)
      : 0,
    strongReasoningCount,
    misconceptionCount,
    guessCount,
    reasoningScore,
    understandingLevel,
    reasoningDetails,
    summary: buildReasoningSummary(
      totalReasoningRequired, strongReasoningCount,
      misconceptionCount, guessCount, understandingLevel
    ),
  };
}

/**
 * Build a human-readable reasoning summary
 */
function buildReasoningSummary(required, strong, misconceptions, guesses, level) {
  const parts = [];

  if (required === 0) {
    return 'No reasoning checkpoints were triggered in this assessment.';
  }

  const strongPct = Math.round((strong / required) * 100);
  parts.push(`${strongPct}% of reasoning responses demonstrated understanding.`);

  if (misconceptions > 0) {
    parts.push(`${misconceptions} misconception${misconceptions > 1 ? 's' : ''} detected in reasoning.`);
  }

  if (guesses > 0) {
    parts.push(`${guesses} answer${guesses > 1 ? 's' : ''} may be guesses based on reasoning quality.`);
  }

  const levelDescriptions = {
    demonstrated: 'Overall reasoning shows solid understanding.',
    partial: 'Some reasoning is sound, but gaps remain.',
    fragile: 'Reasoning is weak — knowledge is not yet secure.',
    uncertain: 'Little meaningful reasoning was provided.',
    unknown: 'Insufficient reasoning data to assess understanding.',
  };
  parts.push(levelDescriptions[level] || '');

  return parts.join(' ');
}

// ============================================================================
// EVIDENCE STRENGTH FOR MASTERY
// ============================================================================

/**
 * Calculate how reasoning evidence should affect mastery determination.
 * Returns a multiplier: > 1.0 strengthens evidence, < 1.0 weakens it.
 */
export function getReasoningMasteryMultiplier(reasoningAnalysis) {
  if (!reasoningAnalysis || reasoningAnalysis.totalReasoningRequired === 0) {
    return 1.0; // No reasoning data — neutral
  }

  const { understandingLevel, misconceptionCount, guessCount } = reasoningAnalysis;

  switch (understandingLevel) {
    case 'demonstrated':
      return 1.2; // Strong reasoning = boost mastery
    case 'partial':
      return 1.0; // Neutral
    case 'fragile':
      return 0.8; // Weak reasoning = reduce mastery confidence
    case 'uncertain':
      return 0.6; // No reasoning = significantly reduce mastery
    default:
      return 1.0;
  }
}
