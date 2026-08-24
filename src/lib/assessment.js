// Deterministic scoring + mistake-pattern inference (no AI here).

export function scoreAttempt(questions, answers) {
  let correct = 0;
  const mistakes = [];
  let answered = 0;
  questions.forEach((q, i) => {
    const a = answers[i];
    if (a !== undefined && a !== null) {
      answered++;
      if (a === q.correct_index) correct++;
      else mistakes.push({ question: q, student: a, correct: q.correct_index });
    }
  });
  const unanswered = questions.length - answered;
  return {
    total: questions.length,
    correct,
    unanswered,
    score: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    mistakes,
  };
}

export function inferPattern(mistake) {
  const q = mistake.question || {};
  const text = (q.question_text || "").toLowerCase();
  const opts = q.options || [];
  const student = mistake.student;
  const correct = mistake.correct;
  if (typeof student === "number" && typeof correct === "number" && opts[student] && opts[correct]) {
    const sa = String(opts[student]).replace(/[-+]/g, "").trim();
    const ca = String(opts[correct]).replace(/[-+]/g, "").trim();
    if (sa && ca && sa === ca) return "sign_error";
  }
  if (/formula|equation|derive|express|solve/.test(text)) return "formula_confusion";
  if (/\b(not|except|never|always|least)\b/.test(text)) return "misreading";
  return "concept_confusion";
}