import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from './auth.js';

const ALOC_BASE = 'https://dev.aloc.com.ng/api/v1';

interface AlocStatus {
  configured: boolean;
  reachable: boolean;
  authorized: boolean;
  lastSuccess: string | null;
  lastFailure: string | null;
  importedCount: number;
}

let alocStatus: AlocStatus = {
  configured: false, reachable: false, authorized: false,
  lastSuccess: null, lastFailure: null, importedCount: 0,
};

async function alocRequest(endpoint: string, apiKey: string, params?: Record<string, string>) {
  const url = new URL(`${ALOC_BASE}${endpoint}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: { 'X-API-Key': apiKey } });
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    throw new Error(`Rate limited. Retry after ${retryAfter || '60'}s`);
  }
  if (!res.ok) throw new Error(`ALOC API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function alocRoutes(app: FastifyInstance) {
  app.get('/api/aloc/health', { preHandler: [authMiddleware] }, async () => {
    return { success: true, data: alocStatus };
  });

  app.get('/api/aloc/questions', { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = process.env.ALOC_API_KEY;
    if (!apiKey) return reply.status(503).send({ success: false, error: 'ALOC_API_KEY not configured' });

    const { subject, examType, year, limit: limitStr } = request.query as { subject?: string; examType?: string; year?: string; limit?: string };
    const limit = limitStr ? parseInt(limitStr, 10) : 20;

    try {
      const params: Record<string, string> = {};
      if (subject) params.subject = subject;
      if (examType) params.examType = examType;
      if (year) params.year = year;
      params.limit = String(Math.min(limit, 50));
      const data = await alocRequest('/questions', apiKey, params);
      alocStatus.configured = true; alocStatus.reachable = true; alocStatus.authorized = true;
      alocStatus.lastSuccess = new Date().toISOString();
      return reply.send({ success: true, data });
    } catch (error: any) {
      alocStatus.configured = true; alocStatus.lastFailure = new Date().toISOString();
      if (error.message.includes('401') || error.message.includes('403')) alocStatus.authorized = false;
      else if (error.message.includes('Rate limited')) return reply.status(429).send({ success: false, error: error.message });
      else alocStatus.reachable = false;
      return reply.status(502).send({ success: false, error: error.message });
    }
  });

  app.post('/api/aloc/sync', { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = process.env.ALOC_API_KEY;
    if (!apiKey) return reply.status(503).send({ success: false, error: 'ALOC_API_KEY not configured' });

    const { subject, examType, year } = request.body as { subject?: string; examType?: string; year?: string };

    try {
      const params: Record<string, string> = {};
      if (subject) params.subject = subject;
      if (examType) params.examType = examType;
      if (year) params.year = year;
      params.limit = '50';
      const data = await alocRequest('/questions', apiKey, params) as any;
      const alocQuestions = data.data || data.questions || data || [];
      if (!Array.isArray(alocQuestions)) return reply.send({ success: true, data: { imported: 0 } });

      const { getDb } = await import('../db/index.js');
      const { questions: questionsTable } = await import('../db/schema/index.js');
      const db = getDb();
      let imported = 0;
      for (const q of alocQuestions) {
        try {
          const options = q.options || q.choices || [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
          await db.insert(questionsTable).values({
            concept: q.subject || subject || 'General',
            exam: q.examType || examType || 'JAMB',
            subject: q.subject || subject || 'General',
            questionText: q.question || q.question_text || q.text || '',
            options: options.map(String),
            correctIndex: typeof (q.correct_index ?? q.correctIndex) === 'number' ? (q.correct_index ?? q.correctIndex) : 0,
            explanation: q.explanation || q.solution || '',
            difficulty: 'intermediate',
            provenance: 'third_party_sourced',
            sourceLabel: `ALOC API (${q.examType || examType || 'JAMB'} ${q.year || year || ''})`.trim(),
          });
          imported++;
        } catch {}
      }
      alocStatus.importedCount += imported;
      return reply.send({ success: true, data: { imported, total: alocQuestions.length } });
    } catch (error: any) {
      return reply.status(502).send({ success: false, error: error.message });
    }
  });
}
