const API_BASE = import.meta.env.VITE_API_URL || '';

async function invokeLLM(opts) {
  const res = await fetch(`${API_BASE}/api/llm/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function fetchQuestions({ concept, difficulty, count, exam, subject }) {
  if (API_BASE) {
    try {
      const params = new URLSearchParams({ concept, sort: '-created_date', limit: '100' });
      const res = await fetch(`${API_BASE}/api/entities/questions/filter?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('alpha_auth_token') || ''}` },
      });
      if (res.ok) {
        let qs = (await res.json()).data || [];
        if (difficulty && difficulty !== 'exam' && difficulty !== 'challenge') {
          qs = qs.filter((q) => !q.difficulty || q.difficulty === difficulty);
        } else if (difficulty === 'challenge') {
          qs = qs.filter((q) => q.difficulty === 'challenge' || q.difficulty === 'advanced' || q.difficulty === 'exam');
        }
        qs = shuffle(qs);
        if (qs.length >= count) return qs.slice(0, count);
      }
    } catch {}
  }
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
    source_label: 'AI-generated practice (not an official exam question)',
  }));
}
