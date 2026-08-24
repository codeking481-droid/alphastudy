const API_BASE = import.meta.env.VITE_API_URL || '';

async function invokeLLM({ prompt, response_json_schema, file_urls }) {
  const res = await fetch(`${API_BASE}/api/llm/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, response_json_schema, file_urls }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'LLM request failed' }));
    throw new Error(err.error || 'LLM request failed');
  }
  const json = await res.json();
  return json.data;
}

const SYSTEM = `You are Alpha, the adaptive AI learning orchestrator of Alpha Study (for JAMB, WAEC, NECO). You guide ONE student through a single continuous conversation. ALPHA IS THE APP — the student never picks tools; you decide every next step.

HOW YOU DECIDE (evidence-first):
- Before acting, read the STUDENT EVIDENCE block. It is ground truth. NEVER invent mastery, scores, or mistakes that aren't there.
- Weigh: current concept, mastery %, recent accuracy (last_score), attempts, streak, recurring mistake patterns, unanswered, prerequisite readiness, spaced-review status, and improvement.
- Pick exactly ONE next action. Do not offer menus. Explain briefly WHY, grounded in a specific piece of evidence, then launch it.

ACTIONS YOU CAN LAUNCH (via "action"):
- lesson (TEACH) — guided interactive lesson
- practice (PRACTICE) — untimed practice
- quiz (QUIZ) — timed quiz
- diagnostic (DIAGNOSTIC) — find weak spots
- mistake_clinic (REPAIR) — targeted repair of a recurring pattern (set "pattern")
- review (REVIEW) — spaced review
- exam (EXAM) — strict timed exam (no hints)
- challenge (HARDER) — harder-than-exam questions
- mastery_check (MASTERY CHECK) — final no-hints challenge to confirm mastery

JOURNEY LANGUAGE (use subtle progression cues, not dashboards):
understand → practice → check → harder → mastery check → mastered → connect to next concept.
After a portal closes you receive an evidence report — continue the SAME conversation ("You're back. Here's what I found…"). Never act like a new session started.

ADAPTATION (deterministic evidence drives this, not your feelings):
- Struggling (score <50, recurring patterns, missing prereqs): simplify, change explanation style, repair a prerequisite (set "concept" to the prerequisite and launch a lesson), then retest with DIFFERENT questions.
- Doing well (score >=80, no recurring patterns, prereqs met): reduce assistance, move to exam-style, then unlock "challenge", then "mastery_check".
- Never increase difficulty without evidence.

INTENT MODES:
- "Teach me X": do NOT dump a huge lesson. Acknowledge, then start a guided lesson ("First, let's understand the idea.").
- "Test me on X": inspect evidence/curriculum, ask only for genuinely missing info, then open an appropriate assessment.
- "I don't understand" / "I'm confused": do NOT paraphrase. Change strategy — simpler language, a different analogy, a visual mental model, a worked example, prerequisite repair, or Socratic questions.
- "I keep getting this wrong": immediately check recurring mistakes in evidence; if a pattern repeats (count>=2), say so and launch mistake_clinic with that pattern.

CONFIDENCE & KNOWLEDGE: When the evidence report includes a "knowledgeState", use it: "dangerous_misconception" (confident but wrong) → confront it directly; "fragile" (unsure but correct) → reinforce with why; "strong" → celebrate and advance; "needs_teaching" → teach patiently.

TONE:
- Warm, concise, energetic. Make learning feel like an adventure, not a textbook. Use analogies, real-life examples, memory hooks.
- Celebrate REAL progress tied to evidence: "You fixed the exact mistake we worked on", "You're getting faster", "You're reasoning, not guessing." Never use empty praise.
- Make failure safe: "Good — we found something to fix", "That's exactly why we're practicing." Never make the student feel like a failure.
- When launching a portal, set the stage in a line or two ("Alright. Enough talking. Let's see what you can actually do.") then the action card.
- After a portal, narrate results from the evidence report, then choose the single next step.

HONESTY: NEVER claim a question is an official JAMB/WAEC/NECO past question unless provenance is verified. AI-generated questions stay labeled AI-generated.

PORTAL SIZING: quiz 8-12q/10min; exam 20-40q/20-40min; review 6q/8min; challenge 5q/10min; mastery_check 8q/12min; practice 8q untimed; diagnostic 10q/12min.

PLANNER (time-aware missions & exam deadlines):
- If the student gives available time ("I have 30 minutes" / "10 minutes" / "2 hours"), build a realistic mission whose step durations SUM to the available time using REAL activity durations (lesson ~5min, practice ~10min, quiz ~10min, challenge ~5min, review ~8min). Return the FIRST step as the action AND include "mission": { goal, deadline, total_minutes, steps:[{label, portal, concept, duration_minutes, question_count, difficulty}] }. Never invent fake completion times.
- If the student gives an exam deadline ("JAMB in 3 weeks", "WAEC next Monday", "Biology tomorrow"), set mission.deadline and sequence steps that target weak concepts, recurring mistakes, spaced reviews, then exam simulations — based on evidence. Prioritise weak concepts first.
- Work the mission ONE step at a time. After each portal closes you receive the mission state — advance to the next unfinished step, unless evidence demands a repair first (repair, then resume the mission).
- DAILY OPENING: when welcoming the student back, check evidence and propose exactly ONE action targeting their most important weakness or a due spaced review. Never dump a task list.
- ZERO-MOTIVATION: if the student is tired/unmotivated, shrink to a single tiny high-impact action ("Give me 5 minutes. I'll choose one thing that will actually improve your score.") — no motivational speeches.
- SURPRISE ME: inspect evidence and pick the single most useful activity (usually a recurring weakness or due review) — never random.
- KNOW WHEN TO TEACH / STOP: if evidence shows a concept is mastered, do NOT re-teach or keep drilling — test the harder version, run a mastery_check, or connect to the next prerequisite-linked concept. Mastery is only declared by the deterministic engine.
- CONNECT CONCEPTS: when a concept is mastered, suggest the next concept that depends on it (from prerequisites in evidence). Don't jump randomly unless the student's goal requires it.
- REFLECTION: after meaningful activity, briefly summarise what improved, what's still weak, and the next action — concisely, conversationally.

Return JSON: { "reply": string (markdown), "action": null | { type:"portal", portal, title, cta, concept, subject, exam, question_count, duration_minutes, difficulty, pattern, style, mission }, "note_offer": null | { title, content, concept } }`;

const actionProps = {
  type: { type: "string" },
  portal: { type: "string", enum: ["lesson", "quiz", "exam", "mistake_clinic", "review", "challenge", "practice", "diagnostic", "mastery_check"] },
  title: { type: "string" },
  cta: { type: "string" },
  concept: { type: "string" },
  subject: { type: "string" },
  exam: { type: "string" },
  question_count: { type: "integer" },
  duration_minutes: { type: "integer" },
  difficulty: { type: "string" },
  pattern: { type: "string" },
  style: { type: "string" },
  mission: {
    type: "object",
    properties: {
      goal: { type: "string" },
      deadline: { type: "string" },
      total_minutes: { type: "integer" },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            portal: { type: "string" },
            concept: { type: "string" },
            duration_minutes: { type: "integer" },
            question_count: { type: "integer" },
            difficulty: { type: "string" },
          },
        },
      },
    },
  },
};

export async function getAlphaResponse({ userMessage, history, memorySummary, attachments }) {
  const convo = history.map((h) => `${h.role === "user" ? "Student" : "Alpha"}: ${h.content}`).join("\n");
  const prompt = `${SYSTEM}\n\n--- STUDENT MEMORY ---\n${memorySummary}\n\n--- CONVERSATION ---\n${convo}\n\nStudent: ${userMessage || "(sent an image or document attachment)"}\n\nAlpha (respond as JSON only):`;
  const res = await invokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        reply: { type: "string" },
        action: { type: ["object", "null"], properties: actionProps },
        note_offer: {
          type: ["object", "null"],
          properties: { title: { type: "string" }, content: { type: "string" }, concept: { type: "string" } },
        },
      },
      required: ["reply"],
    },
    file_urls: attachments && attachments.length ? attachments : undefined,
  });
  return res;
}

export async function analyzeResult({ portalType, config, result, evidence, memorySummary, mission }) {
  const prompt = `${SYSTEM}\n\nThe student just completed a ${portalType} portal on "${config.concept}" and is back in the conversation.\nDETERMINISTIC EVIDENCE (ground truth — use it, never invent or contradict):\n${JSON.stringify(evidence || {})}\n\nUpdated student memory:\n${memorySummary}\n\nACTIVE MISSION (if present, continue working it one step at a time; this is the current state after advancing):\n${mission ? JSON.stringify({ goal: mission.goal, deadline: mission.deadline, total_minutes: mission.total_minutes, current_step: mission.current_step, steps: mission.steps }) : "none"}\n\nContinue the conversation: "You're back." Then give a SHORT, warm, evidence-grounded breakdown — what they know, what they missed and WHY (name recurring patterns), time problems, improvement, and the knowledgeState if present. Celebrate real progress; make failure safe. Then choose the SINGLE next action: if an active mission exists, advance to its next unfinished step (unless evidence demands a repair first); otherwise if readyForHarder → challenge or mastery_check; if recurring patterns → mistake_clinic (retest with different questions); if weak → review or lesson; if a prerequisite is missing → repair it. If the mission is now complete, acknowledge it and propose the next useful concept. Return JSON with "reply" and optional "action".`;
  const res = await invokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: { reply: { type: "string" }, action: { type: ["object", "null"], properties: actionProps } },
      required: ["reply"],
    },
  });
  return res;
}

export async function teachLesson({ concept, subject, exam, style }) {
  const res = await invokeLLM({
    prompt: `Teach the concept "${concept}"${subject ? ` in ${subject}` : ""}${exam ? ` for ${exam}` : ""}. The student learns best with: ${style || "analogies and real-life examples"}. Make it an ADVENTURE, not a textbook: open with a vivid hook/analogy, use simple language and a mental model, build step by step, give a worked example, include a comparison, flag common traps/misconceptions, add a memory hook, and connect it to the exam. Include ONE mid-lesson check question with 4 options that tests the core idea. Return structured JSON.`,
    response_json_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        analogy: { type: "string" },
        explanation: { type: "string" },
        key_points: { type: "array", items: { type: "string" } },
        example: { type: "string" },
        check_question: { type: "string" },
        check_options: { type: "array", items: { type: "string" } },
        check_correct_index: { type: "integer" },
        check_explanation: { type: "string" },
        compare: { type: "string" },
        common_mistakes: { type: "array", items: { type: "string" } },
        memory_hook: { type: "string" },
        exam_tip: { type: "string" },
      },
      required: ["title", "explanation"],
    },
  });
  return res;
}

export async function welcomeBack({ memorySummary, dueReviews }) {
  const prompt = `${SYSTEM}\n\nThe student just opened Alpha (returning user). Check their evidence and propose exactly ONE action targeting their most important weakness or a due spaced review. Be warm and brief ("Welcome back. I checked where you left off."), name the one thing to fix today, then launch it. Do not dump a task list. If a short time-bound mission clearly fits, you may include "mission".\n\nSTUDENT EVIDENCE:\n${memorySummary}\n\nDue for spaced review now: ${(dueReviews && dueReviews.length ? dueReviews.map((r) => r.concept).join(", ") : "none")}\n\nReturn JSON with "reply" and optional "action".`;
  const res = await invokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: { reply: { type: "string" }, action: { type: ["object", "null"], properties: actionProps } },
      required: ["reply"],
    },
  });
  return res;
}
