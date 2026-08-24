import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from './auth.js';

// ============================================================================
// EXAM CURRICULUM DATA — structured for API serving
// ============================================================================

const EXAMS = {
  JAMB: {
    code: 'JAMB',
    name: 'Joint Admissions and Matriculation Board',
    type: 'university_entrance',
    subjects: ['Use of English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English', 'History', 'Geography', 'Agricultural Science', 'Computer Studies'],
    maxScore: 400,
    questionFormat: 'MCQ',
    questionsPerSubject: 40,
    totalSubjects: 4,
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
// ROUTES
// ============================================================================

export async function curriculumRoutes(app: FastifyInstance) {
  // GET /api/curriculum/exams — list all supported exams
  app.get('/api/curriculum/exams', { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const exams = Object.values(EXAMS).map(e => ({
      code: e.code,
      name: e.name,
      type: e.type,
      subjectCount: e.subjects.length,
      maxScore: (e as any).maxScore || null,
      targetBands: (e as any).targetBands || null,
      gradeScale: (e as any).gradeScale || null,
    }));
    return reply.send({ success: true, data: exams });
  });

  // GET /api/curriculum/exams/:code — get exam details
  app.get('/api/curriculum/exams/:code', { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };
    const exam = (EXAMS as Record<string, any>)[code.toUpperCase()];
    if (!exam) return reply.status(404).send({ success: false, error: 'Exam not found' });
    return reply.send({ success: true, data: exam });
  });

  // GET /api/curriculum/exams/:code/subjects — get subjects for an exam
  app.get('/api/curriculum/exams/:code/subjects', { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };
    const exam = (EXAMS as Record<string, any>)[code.toUpperCase()];
    if (!exam) return reply.status(404).send({ success: false, error: 'Exam not found' });
    return reply.send({ success: true, data: exam.subjects });
  });

  // GET /api/curriculum/health — health check
  app.get('/api/curriculum/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ success: true, data: { status: 'ok', exams: Object.keys(EXAMS) } });
  });
}
