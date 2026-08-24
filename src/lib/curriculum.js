// ============================================================================
// EXAM CURRICULUM — Structured model: Exam → Subject → Topic → Concept
// ============================================================================
// Data-driven. No invented official syllabus claims.
// Curriculum data can be updated from legitimate sources later.
// ============================================================================

export const EXAMS = {
  JAMB: {
    code: 'JAMB',
    name: 'Joint Admissions and Matriculation Board',
    type: 'university_entrance',
    subjects: ['Use of English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English', 'History', 'Geography', 'Agricultural Science', 'Computer Studies'],
    maxScore: 400,
    questionFormat: 'MCQ',
    questionsPerSubject: 40,
    totalSubjects: 4, // 3 subjects + English
    durationMinutes: 120,
    targetBands: [
      { label: '200+', minScore: 200, description: 'University admission baseline' },
      { label: '250+', minScore: 250, description: 'Competitive university admission' },
      { label: '300+', minScore: 300, description: 'Top university programs' },
      { label: '350+', minScore: 350, description: 'Elite scholarship tier' },
      { label: '380+', minScore: 380, description: 'Maximum readiness target' },
    ],
  },
  WAEC: {
    code: 'WAEC',
    name: 'West African Examinations Council',
    type: 'secondary_completion',
    subjects: ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English', 'History', 'Geography', 'Further Mathematics', 'Agricultural Science', 'Computer Studies'],
    questionFormat: 'mixed', // MCQ + Theory
    durationMinutes: 180, // per subject
    gradeScale: [
      { grade: 'A1', minPercent: 75, description: 'Excellent' },
      { grade: 'B2', minPercent: 70, description: 'Very Good' },
      { grade: 'B3', minPercent: 65, description: 'Good' },
      { grade: 'C4', minPercent: 60, description: 'Credit' },
      { grade: 'C5', minPercent: 55, description: 'Credit' },
      { grade: 'C6', minPercent: 50, description: 'Credit' },
      { grade: 'D7', minPercent: 45, description: 'Pass' },
      { grade: 'E8', minPercent: 40, description: 'Pass' },
      { grade: 'F9', minPercent: 0, description: 'Fail' },
    ],
  },
  NECO: {
    code: 'NECO',
    name: 'National Examinations Council',
    type: 'secondary_completion',
    subjects: ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English', 'History', 'Geography', 'Agricultural Science', 'Computer Studies'],
    questionFormat: 'mixed',
    durationMinutes: 180,
    gradeScale: [
      { grade: 'A1', minPercent: 75, description: 'Excellent' },
      { grade: 'B2', minPercent: 70, description: 'Very Good' },
      { grade: 'B3', minPercent: 65, description: 'Good' },
      { grade: 'C4', minPercent: 60, description: 'Credit' },
      { grade: 'C5', minPercent: 55, description: 'Credit' },
      { grade: 'C6', minPercent: 50, description: 'Credit' },
      { grade: 'D7', minPercent: 45, description: 'Pass' },
      { grade: 'E8', minPercent: 40, description: 'Pass' },
      { grade: 'F9', minPercent: 0, description: 'Fail' },
    ],
  },
};

// ============================================================================
// SUBJECT CURRICULUM — Topics and concepts per subject per exam
// ============================================================================

export const CURRICULUM = {
  JAMB: {
    Mathematics: {
      topics: [
        {
          name: 'Number & Numeration',
          concepts: [
            { name: 'Number bases', prerequisites: [] },
            { name: 'Fractions, decimals, percentages', prerequisites: ['Number bases'] },
            { name: 'Indices and logarithms', prerequisites: ['Fractions, decimals, percentages'] },
            { name: 'Sets', prerequisites: [] },
            { name: 'Ratio, rate, proportion', prerequisites: ['Fractions, decimals, percentages'] },
            { name: 'Surds', prerequisites: ['Fractions, decimals, percentages'] },
          ],
        },
        {
          name: 'Algebra',
          concepts: [
            { name: 'Polynomials', prerequisites: ['Number bases', 'Fractions, decimals, percentages'] },
            { name: 'Inequalities', prerequisites: ['Polynomials'] },
            { name: 'Progression (sequences & series)', prerequisites: ['Polynomials'] },
            { name: 'Binary operations', prerequisites: ['Polynomials'] },
            { name: 'Matrices & determinants', prerequisites: ['Polynomials'] },
          ],
        },
        {
          name: 'Geometry & Mensuration',
          concepts: [
            { name: 'Angles & polygons', prerequisites: [] },
            { name: 'Circle geometry', prerequisites: ['Angles & polygons'] },
            { name: 'Mensuration (areas & volumes)', prerequisites: ['Angles & polygons'] },
            { name: 'Loci', prerequisites: ['Angles & polygons'] },
            { name: 'Construction & bearings', prerequisites: ['Angles & polygons'] },
            { name: 'Trigonometry', prerequisites: ['Circle geometry'] },
          ],
        },
        {
          name: 'Statistics & Probability',
          concepts: [
            { name: 'Measures of central tendency', prerequisites: [] },
            { name: 'Measures of dispersion', prerequisites: ['Measures of central tendency'] },
            { name: 'Frequency distribution', prerequisites: ['Measures of central tendency'] },
            { name: 'Probability', prerequisites: ['Frequency distribution'] },
          ],
        },
        {
          name: 'Calculus',
          concepts: [
            { name: 'Differentiation', prerequisites: ['Polynomials', 'Trigonometry'] },
            { name: 'Integration', prerequisites: ['Differentiation'] },
          ],
        },
      ],
    },
    Physics: {
      topics: [
        {
          name: 'Mechanics',
          concepts: [
            { name: 'Motion in one dimension', prerequisites: [] },
            { name: 'Motion in two dimensions', prerequisites: ['Motion in one dimension'] },
            { name: 'Newton\'s laws of motion', prerequisites: ['Motion in one dimension'] },
            { name: 'Work, energy and power', prerequisites: ['Newton\'s laws of motion'] },
            { name: 'Simple harmonic motion', prerequisites: ['Work, energy and power'] },
          ],
        },
        {
          name: 'Thermal Physics',
          concepts: [
            { name: 'Temperature and heat', prerequisites: [] },
            { name: 'Thermal expansion', prerequisites: ['Temperature and heat'] },
            { name: 'Ideal gas laws', prerequisites: ['Temperature and heat'] },
            { name: 'First law of thermodynamics', prerequisites: ['Ideal gas laws'] },
          ],
        },
        {
          name: 'Waves & Optics',
          concepts: [
            { name: 'Wave motion', prerequisites: [] },
            { name: 'Sound waves', prerequisites: ['Wave motion'] },
            { name: 'Light and optical instruments', prerequisites: ['Wave motion'] },
          ],
        },
        {
          name: 'Electricity & Magnetism',
          concepts: [
            { name: 'Electric fields', prerequisites: [] },
            { name: 'Capacitance', prerequisites: ['Electric fields'] },
            { name: 'Current electricity', prerequisites: ['Electric fields'] },
            { name: 'Electromagnetic induction', prerequisites: ['Current electricity'] },
            { name: 'AC circuits', prerequisites: ['Electromagnetic induction'] },
          ],
        },
        {
          name: 'Modern Physics',
          concepts: [
            { name: 'Atomic structure', prerequisites: [] },
            { name: 'Nuclear physics', prerequisites: ['Atomic structure'] },
          ],
        },
      ],
    },
    Chemistry: {
      topics: [
        {
          name: 'Physical Chemistry',
          concepts: [
            { name: 'Atomic structure & periodicity', prerequisites: [] },
            { name: 'Chemical bonding', prerequisites: ['Atomic structure & periodicity'] },
            { name: 'States of matter', prerequisites: ['Chemical bonding'] },
            { name: 'Thermochemistry', prerequisites: ['Chemical bonding'] },
            { name: 'Reaction kinetics', prerequisites: ['Thermochemistry'] },
            { name: 'Chemical equilibrium', prerequisites: ['Reaction kinetics'] },
            { name: 'Electrochemistry', prerequisites: ['Chemical equilibrium'] },
          ],
        },
        {
          name: 'Inorganic Chemistry',
          concepts: [
            { name: 'Acids, bases & salts', prerequisites: ['Chemical bonding'] },
            { name: 'Qualitative analysis', prerequisites: ['Acids, bases & salts'] },
            { name: 'Periodic properties', prerequisites: ['Atomic structure & periodicity'] },
          ],
        },
        {
          name: 'Organic Chemistry',
          concepts: [
            { name: 'Hydrocarbons', prerequisites: ['Chemical bonding'] },
            { name: 'Alcohols, aldehydes, ketones', prerequisites: ['Hydrocarbons'] },
            { name: 'Carboxylic acids & esters', prerequisites: ['Alcohols, aldehydes, ketones'] },
            { name: 'Polymers', prerequisites: ['Hydrocarbons'] },
          ],
        },
      ],
    },
    Biology: {
      topics: [
        {
          name: 'Cell Biology',
          concepts: [
            { name: 'Cell structure & function', prerequisites: [] },
            { name: 'Cell division (mitosis & meiosis)', prerequisites: ['Cell structure & function'] },
            { name: 'Transport in living organisms', prerequisites: ['Cell structure & function'] },
          ],
        },
        {
          name: 'Genetics & Evolution',
          concepts: [
            { name: 'Heredity & variation', prerequisites: ['Cell division (mitosis & meiosis)'] },
            { name: 'Mendelian genetics', prerequisites: ['Heredity & variation'] },
            { name: 'Evolution', prerequisites: ['Mendelian genetics'] },
          ],
        },
        {
          name: 'Ecology',
          concepts: [
            { name: 'Ecosystems', prerequisites: [] },
            { name: 'Energy flow in ecosystems', prerequisites: ['Ecosystems'] },
            { name: 'Human impact on environment', prerequisites: ['Ecosystems'] },
          ],
        },
        {
          name: 'Plant Biology',
          concepts: [
            { name: 'Plant structure & tissues', prerequisites: ['Cell structure & function'] },
            { name: 'Photosynthesis', prerequisites: ['Plant structure & tissues'] },
            { name: 'Plant nutrition & transport', prerequisites: ['Photosynthesis'] },
          ],
        },
      ],
    },
    'Use of English': {
      topics: [
        {
          name: 'Comprehension',
          concepts: [
            { name: 'Reading comprehension', prerequisites: [] },
            { name: 'Inference & interpretation', prerequisites: ['Reading comprehension'] },
          ],
        },
        {
          name: 'Grammar & Usage',
          concepts: [
            { name: 'Parts of speech', prerequisites: [] },
            { name: 'Tenses', prerequisites: ['Parts of speech'] },
            { name: 'Subject-verb agreement', prerequisites: ['Parts of speech'] },
            { name: 'Active & passive voice', prerequisites: ['Tenses'] },
            { name: 'Direct & reported speech', prerequisites: ['Tenses'] },
          ],
        },
        {
          name: 'Vocabulary',
          concepts: [
            { name: 'Synonyms & antonyms', prerequisites: [] },
            { name: 'Idioms & figurative language', prerequisites: ['Synonyms & antonyms'] },
          ],
        },
        {
          name: 'Oral English',
          concepts: [
            { name: 'Consonant clusters', prerequisites: [] },
            { name: 'Stress patterns', prerequisites: [] },
            { name: 'Intonation', prerequisites: ['Stress patterns'] },
          ],
        },
      ],
    },
    Economics: {
      topics: [
        {
          name: 'Foundations',
          concepts: [
            { name: 'Basic economic concepts', prerequisites: [] },
            { name: 'Factors of production', prerequisites: ['Basic economic concepts'] },
            { name: 'Demand & supply', prerequisites: ['Factors of production'] },
          ],
        },
        {
          name: 'Microeconomics',
          concepts: [
            { name: 'Price determination', prerequisites: ['Demand & supply'] },
            { name: 'Market structures', prerequisites: ['Price determination'] },
            { name: 'Production & costs', prerequisites: ['Market structures'] },
          ],
        },
        {
          name: 'Macroeconomics',
          concepts: [
            { name: 'National income accounting', prerequisites: [] },
            { name: 'Money & banking', prerequisites: ['National income accounting'] },
            { name: 'Inflation & deflation', prerequisites: ['Money & banking'] },
            { name: 'Government budget', prerequisites: ['National income accounting'] },
            { name: 'International trade', prerequisites: ['National income accounting'] },
          ],
        },
      ],
    },
    Government: {
      topics: [
        {
          name: 'Political Concepts',
          concepts: [
            { name: 'Basic political concepts', prerequisites: [] },
            { name: 'Organs of government', prerequisites: ['Basic political concepts'] },
            { name: 'Separation of powers', prerequisites: ['Organs of government'] },
          ],
        },
        {
          name: 'Nigerian Government',
          concepts: [
            { name: 'Constitutional development', prerequisites: ['Basic political concepts'] },
            { name: 'Federalism in Nigeria', prerequisites: ['Constitutional development'] },
            { name: 'Political parties & elections', prerequisites: ['Federalism in Nigeria'] },
          ],
        },
      ],
    },
    Literature: {
      topics: [
        {
          name: 'Drama',
          concepts: [
            { name: 'Drama forms & techniques', prerequisites: [] },
            { name: 'Dramatic analysis', prerequisites: ['Drama forms & techniques'] },
          ],
        },
        {
          name: 'Prose',
          concepts: [
            { name: 'Prose forms & elements', prerequisites: [] },
            { name: 'Prose analysis', prerequisites: ['Prose forms & elements'] },
          ],
        },
        {
          name: 'Poetry',
          concepts: [
            { name: 'Poetic forms & devices', prerequisites: [] },
            { name: 'Poetry analysis', prerequisites: ['Poetic forms & devices'] },
          ],
        },
      ],
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all concepts for a subject in a given exam
 */
export function getConceptsForSubject(exam, subject) {
  const examCurriculum = CURRICULUM[exam];
  if (!examCurriculum || !examCurriculum[subject]) return [];
  const concepts = [];
  for (const topic of examCurriculum[subject].topics) {
    for (const concept of topic.concepts) {
      concepts.push({
        ...concept,
        topic: topic.name,
        subject,
        exam,
      });
    }
  }
  return concepts;
}

/**
 * Get all subjects for an exam
 */
export function getSubjectsForExam(exam) {
  const examData = EXAMS[exam];
  if (!examData) return [];
  return examData.subjects;
}

/**
 * Get prerequisites for a concept
 */
export function getPrerequisites(exam, subject, conceptName) {
  const concepts = getConceptsForSubject(exam, subject);
  const concept = concepts.find(c => c.name === conceptName);
  if (!concept || !concept.prerequisites || !concept.prerequisites.length) return [];
  return concept.prerequisites.map(pName => {
    const prereq = concepts.find(c => c.name === pName);
    return prereq || { name: pName, topic: 'Unknown', subject, exam };
  });
}

/**
 * Get the topic containing a concept
 */
export function getTopicForConcept(exam, subject, conceptName) {
  const examCurriculum = CURRICULUM[exam];
  if (!examCurriculum || !examCurriculum[subject]) return null;
  for (const topic of examCurriculum[subject].topics) {
    if (topic.concepts.some(c => c.name === conceptName)) return topic;
  }
  return null;
}

/**
 * Get syllabus coverage for a subject based on learning records
 */
export function getSyllabusCoverage(exam, subject, records) {
  const allConcepts = getConceptsForSubject(exam, subject);
  if (!allConcepts.length) return { total: 0, covered: 0, mastered: 0, percent: 0 };

  const relevantRecords = records.filter(r => r.concept && r.exam === exam && r.subject === subject);
  const conceptStatus = {};
  for (const r of relevantRecords) {
    conceptStatus[r.concept] = r.status;
  }

  let covered = 0;
  let mastered = 0;
  for (const c of allConcepts) {
    const status = conceptStatus[c.name];
    if (status === 'mastered') mastered++;
    if (status && status !== 'not_started') covered++;
  }

  return {
    total: allConcepts.length,
    covered,
    mastered,
    percent: Math.round((covered / allConcepts.length) * 100),
    masteredPercent: Math.round((mastered / allConcepts.length) * 100),
  };
}

/**
 * Get subject priority based on exam structure
 * For JAMB: English is always required; other 3 are student choice
 */
export function getSubjectPriority(exam, subject) {
  if (exam === 'JAMB') {
    if (subject === 'Use of English') return 'required';
    return 'chosen';
  }
  // WAEC/NECO: all subjects are important
  return 'required';
}

/**
 * Get the exam info
 */
export function getExamInfo(exam) {
  return EXAMS[exam] || null;
}

/**
 * Get JAMB score band label
 */
export function getJambBandLabel(score) {
  const exam = EXAMS.JAMB;
  for (let i = exam.targetBands.length - 1; i >= 0; i--) {
    if (score >= exam.targetBands[i].minScore) return exam.targetBands[i].label;
  }
  return '< 200';
}

/**
 * Get WAEC/NECO grade from score percentage
 */
export function getGrade(exam, scorePercent) {
  const examData = EXAMS[exam];
  if (!examData || !examData.gradeScale) return null;
  for (const g of examData.gradeScale) {
    if (scorePercent >= g.minPercent) return g;
  }
  return examData.gradeScale[examData.gradeScale.length - 1];
}
