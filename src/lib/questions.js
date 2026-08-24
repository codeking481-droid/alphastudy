const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function invokeLLM({ prompt, response_json_schema }) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured. Add VITE_GROQ_API_KEY to your environment.');
  }

  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4096,
  };

  if (response_json_schema) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Groq API error:', res.status, err);
    throw new Error(`AI request failed (${res.status})`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (response_json_schema) {
    try {
      let jsonStr = content;
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }
      return JSON.parse(jsonStr);
    } catch {
      return { questions: [] };
    }
  }

  return content;
}

function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

export async function fetchQuestions({ concept, difficulty, count, exam, subject }) {
  // Always generate via AI (DB not connected yet)
  const gen = await generateQuestions({ concept, difficulty, count, exam, subject });
  return gen;
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
