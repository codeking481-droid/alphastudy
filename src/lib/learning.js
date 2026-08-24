const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };


import { computeMastery, isMastered } from "./mastery";
import { inferPattern } from "./assessment";
import { scheduleNextReview } from "./spaced";

export async function fetchMemory() {
  const [records, mistakes, concepts] = await Promise.all([
    db.entities.LearningRecord.list("-updated_date", 200),
    db.entities.Mistake.list("-created_date", 50),
    db.entities.Concept.list("-created_date", 200),
  ]);
  return { records, mistakes, concepts };
}

export function buildMemorySummary({ records, mistakes, concepts }, dueReviews) {
  const byName = {};
  (concepts || []).forEach((c) => { byName[c.concept] = c; });
  const mastered = records.filter((r) => r.status === "mastered").map((r) => r.concept);
  const inProgress = records
    .filter((r) => r.status === "learning" || r.status === "practiced")
    .map((r) => {
      let prereq = "";
      const c = byName[r.concept];
      if (c && c.prerequisites && c.prerequisites.length) {
        const unmet = c.prerequisites.filter((p) => !mastered.includes(p));
        prereq = unmet.length ? ` [missing prereqs: ${unmet.join(", ")}]` : " [prereqs satisfied]";
      }
      return `${r.concept} [mastery ${r.mastery_score || 0}%, attempts ${r.attempts || 0}, last ${r.last_score || 0}%, streak ${r.streak || 0}]${prereq}`;
    });
  const weak = records.filter((r) => r.status === "needs_review").map((r) => r.concept);
  const patterns = {};
  mistakes.forEach((m) => { patterns[m.pattern] = (patterns[m.pattern] || 0) + 1; });
  const topPatterns = Object.entries(patterns).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p, c]) => `${p}(${c})`).join(", ");
  const style = records.find((r) => r.preferred_style)?.preferred_style;
  let s = `STUDENT EVIDENCE:\n`;
  s += `- Mastered: ${mastered.join(", ") || "none"}\n`;
  s += `- In progress: ${inProgress.join("; ") || "none"}\n`;
  s += `- Weak / needs review: ${weak.join(", ") || "none"}\n`;
  s += `- Recurring mistake patterns: ${topPatterns || "none"}\n`;
  s += `- Preferred explanation style: ${style || "unknown"}`;
  if (dueReviews && dueReviews.length) s += `\n- Due for spaced review now: ${dueReviews.map((r) => r.concept).join(", ")}`;
  return s;
}

export async function recordAttempt(cfg, result) {
  const concept = cfg.concept;
  const existing = await db.entities.LearningRecord.filter({ concept }, "-updated_date", 1);
  const prev = existing[0] || { concept, status: "learning", attempts: 0, correct: 0, mastery_score: 0, streak: 0 };
  const attempts = (prev.attempts || 0) + 1;
  const correct = (prev.correct || 0) + result.correct;
  const streak = result.score >= 70 ? (prev.streak || 0) + 1 : 0;
  const mastery = computeMastery({ ...prev, attempts, correct, last_score: result.score, streak });
  const mastered = isMastered({ ...prev, attempts, correct, last_score: result.score, streak, mastery_score: mastery });
  const status = mastered ? "mastered" : result.score < 50 ? "needs_review" : result.correct > 0 ? "practiced" : "learning";
  const next = scheduleNextReview(result.score, prev.next_review);
  const seen = Array.from(new Set([...(prev.seen_questions || []), ...(result.question_ids || [])]));
  const payload = {
    ...prev,
    concept,
    exam: cfg.exam || prev.exam,
    subject: cfg.subject || prev.subject,
    attempts,
    correct,
    last_score: result.score,
    streak,
    mastery_score: mastery,
    status,
    last_reviewed: new Date().toISOString(),
    next_review: next,
    seen_questions: seen,
  };
  if (existing[0]) await db.entities.LearningRecord.update(existing[0].id, payload);
  else await db.entities.LearningRecord.create(payload);
  return payload;
}

export async function markLearningStarted(cfg) {
  const concept = cfg.concept;
  if (!concept) return;
  const existing = await db.entities.LearningRecord.filter({ concept }, "-updated_date", 1);
  if (existing[0]) {
    if (existing[0].status === "not_started" || !existing[0].status) {
      await db.entities.LearningRecord.update(existing[0].id, {
        status: "learning",
        exam: cfg.exam || existing[0].exam,
        subject: cfg.subject || existing[0].subject,
      });
    }
  } else {
    await db.entities.LearningRecord.create({
      concept,
      exam: cfg.exam,
      subject: cfg.subject,
      status: "learning",
    });
  }
}

export async function recordMistakes(cfg, mistakes, portalType) {
  for (const m of mistakes) {
    const pattern = inferPattern(m);
    await db.entities.Mistake.create({
      concept: cfg.concept,
      question_text: m.question?.question_text || "",
      student_answer: String(m.student),
      correct_answer: String(m.correct),
      pattern,
      portal_type: portalType,
    });
  }
}

export async function saveNote(note) {
  return await db.entities.Note.create(note);
}

export async function getDueReviews() {
  const records = await db.entities.LearningRecord.list("-updated_date", 200);
  const now = new Date();
  return records.filter((r) => r.next_review && new Date(r.next_review) <= now && r.status !== "not_started");
}