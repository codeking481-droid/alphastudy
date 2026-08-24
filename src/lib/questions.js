const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };


function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

// Question supply with honest provenance. Falls back to AI-generated
// questions that are EXPLICITLY labeled as AI-generated (never official).
export async function fetchQuestions({ concept, difficulty, count, exam, subject }) {
  const recs = await db.entities.LearningRecord.filter({ concept }, "-updated_date", 1);
  const seen = new Set((recs[0]?.seen_questions || []));
  let qs = await db.entities.Question.filter({ concept }, "-created_date", 100);
  qs = qs.filter((q) => !seen.has(q.id));
  if (difficulty && difficulty !== "exam" && difficulty !== "challenge") {
    qs = qs.filter((q) => !q.difficulty || q.difficulty === difficulty);
  } else if (difficulty === "challenge") {
    qs = qs.filter((q) => q.difficulty === "challenge" || q.difficulty === "advanced" || q.difficulty === "exam");
  }
  qs = shuffle(qs);
  if (qs.length < count) {
    const need = count - qs.length;
    const gen = await generateQuestions({ concept, difficulty, count: need, exam, subject });
    qs = [...qs, ...gen];
  }
  return qs.slice(0, count);
}

export async function generateQuestions({ concept, difficulty, count, exam, subject }) {
  const res = await db.integrations.Core.InvokeLLM({
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