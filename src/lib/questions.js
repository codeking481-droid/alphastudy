const API_BASE = import.meta.env.VITE_API_URL || '';

async function invokeLLM({ prompt, response_json_schema }) {
  const res = await fetch(`${API_BASE}/api/llm/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, response_json_schema }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'LLM request failed' }));
    throw new Error(err.error || `AI request failed (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

export async function fetchQuestions({ concept, difficulty, count, exam, subject }) {
  // Try API first, fallback to AI generation
  if (API_BASE) {
    try {
      const params = new URLSearchParams({ concept, sort: '-created_date', limit: '100' });
      const res = await fetch(`${API_BASE}/api/entities/questions/filter?${params}`);
      if (res.ok) {
        const json = await res.json();
        let qs = json.data || [];
        if (difficulty && difficulty !== "exam" && difficulty !== "challenge") {
          qs = qs.filter((q) => !q.difficulty || q.difficulty === difficulty);
        } else if (difficulty === "challenge") {
          qs = qs.filter((q) => q.difficulty === "challenge" || q.difficulty === "advanced" || q.difficulty === "exam");
        }
        qs = shuffle(qs);
        if (qs.length >= count) return qs.slice(0, count);
      }
    } catch {}
  }
  // Fallback: generate via AI
  return generateQuestions({ concept, difficulty, count, exam, subject });
}

export async function generateQuestions({ concept, difficulty, count, exam, subject }) {
  const res = await invokeLLM({
    prompt: `Generate ${count} original multiple-choice PRACTICE questions on the concept "${concept}"${
      subject ? ` in ${subject}` : ""
    }${exam ? ` for ${exam} preparation` : ""} at ${difficulty || "intermediate"} difficulty. Each must have exactly 4 options, a correct_index (0-3), and a short explanation. Be scientifically accurate.`,
    response_json_schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question_text: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              correct_index: { type: "integer" },
              explanation: { type: "string" },
              difficulty: { type: "string" },
            },
            required: ["question_text", "options", "correct_index"],
          },
        },
      },
      required: ["questions"],
    },
  });
  return (res.questions || []).map((q) => ({
    ...q,
    concept,
    exam,
    subject,
    difficulty: q.difficulty || difficulty,
    provenance: "ai_generated",
    source_label: "AI-generated practice (not an official exam question)",
  }));
}
