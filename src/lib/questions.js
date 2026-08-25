const API_BASE = import.meta.env.VITE_API_URL || '';

async function invokeLLM(opts) {
  const res = await fetch(`${API_BASE}/api/llm/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('alpha_auth_token') || ''}`,
    },
    body: JSON.stringify({ messages: opts.messages, prompt: opts.prompt, response_json_schema: opts.response_json_schema }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

function normalizeAlocQuestions(raw, fallback = {}) {
  const list = raw?.data || raw?.questions || raw || [];
  if (!Array.isArray(list)) return [];
  return list.map((q) => {
    const opts = q.options || q.choices || [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
    const correct = q.correct_index ?? q.correctIndex ?? q.answer_index ?? 0;
    return {
      question_text: q.question || q.question_text || q.text || '',
      options: (opts || []).map(String),
      correct_index: typeof correct === 'number' ? correct : parseInt(correct, 10) || 0,
      explanation: q.explanation || q.solution || '',
      concept: fallback.concept,
      subject: fallback.subject || q.subject || 'General',
      exam: fallback.exam || q.examType || 'JAMB',
      difficulty: fallback.difficulty || 'intermediate',
      provenance: 'aloc_sourced',
      source_label: `ALOC ${q.examType || fallback.exam || 'JAMB'} ${q.subject || fallback.subject || ''} ${q.year || ''}`.trim(),
      year: q.year,
    };
  }).filter((q) => q.question_text && q.options.length === 4);
}

export async function fetchQuestions({ concept, difficulty, count, exam, subject }) {
  const token = localStorage.getItem('alpha_auth_token') || '';
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  // 1) Try ALOC real past questions first (ALOC_API_KEY on server)
  try {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (concept && !subject) params.set('subject', concept);
    if (exam) params.set('examType', exam);
    if (concept) params.set('search', concept);
    params.set('limit', String(Math.min(count, 20)));
    const res = await fetch(`${API_BASE}/api/aloc/questions?${params}`, { headers });
    if (res.ok) {
      const json = await res.json();
      const normalized = normalizeAlocQuestions(json.data, { concept, subject, exam, difficulty });
      if (normalized.length >= Math.min(count, 5)) {
        const picked = shuffle(normalized).slice(0, count);
        if (picked.length) return picked;
      }
      if (normalized.length > 0) {
        const need = count - normalized.length;
        const remainder = await generateQuestions({ concept, difficulty, count: need, exam, subject });
        return [...shuffle(normalized), ...remainder].slice(0, count);
      }
    }
  } catch {}

  // 2) Try local curated questions (synced from ALOC or manual)
  try {
    const params = new URLSearchParams({ sort: '-created_at', limit: '100' });
    if (concept) params.set('concept', concept);
    if (subject) params.set('subject', subject);
    if (exam) params.set('exam', exam);
    const res = await fetch(`${API_BASE}/api/entities/questions/filter?${params}`, { headers });
    if (res.ok) {
      let qs = (await res.json()).data || [];
      if (difficulty && difficulty !== 'exam' && difficulty !== 'challenge') {
        qs = qs.filter((q) => !q.difficulty || q.difficulty === difficulty);
      } else if (difficulty === 'challenge') {
        qs = qs.filter((q) => q.difficulty === 'challenge' || q.difficulty === 'advanced' || q.difficulty === 'exam');
      }
      qs = shuffle(qs);
      if (qs.length >= count) return qs.slice(0, count);
      if (qs.length > 0) {
        const need = count - qs.length;
        const aiQs = await generateQuestions({ concept, difficulty, count: need, exam, subject });
        return [...qs, ...aiQs].slice(0, count);
      }
    }
  } catch {}

  // 3) Fallback to Groq teaching generation (120b)
  return generateQuestions({ concept, difficulty, count, exam, subject });
}

export async function generateQuestions({ concept, difficulty, count, exam, subject }) {
  const diff = difficulty || 'intermediate';
  const examPart = exam ? ` for ${exam}` : '';
  const subjectPart = subject ? ` in ${subject}` : '';

  const result = await invokeLLM({
    messages: [
      {
        role: 'user',
        content: `Generate ${count} original MCQ practice questions on "${concept}"${subjectPart}${examPart} at ${diff} difficulty. Each: 4 options, correct_index (0-3), short explanation. Return as JSON with key "questions".`,
      },
    ],
  });

  const questions = Array.isArray(result) ? result : (result.questions || []);
  return questions.map((q) => ({
    ...q,
    concept,
    exam,
    subject,
    difficulty: q.difficulty || diff,
    provenance: 'ai_generated',
    source_label: 'AI-generated practice (Groq 120b) — not an official exam question',
  }));
}
