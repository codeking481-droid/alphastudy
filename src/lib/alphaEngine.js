const API_BASE = import.meta.env.VITE_API_URL || '';

async function invokeLLM({ messages, prompt, response_json_schema }) {
  if (!API_BASE) throw new Error('Backend API not configured. Set VITE_API_URL.');
  const res = await fetch(`${API_BASE}/api/llm/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, prompt, response_json_schema }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
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
- Never say "I'll launch a lesson." Say "Let's talk about..." or "Here's something interesting about..."
- Never show percentages or scores unprompted. Say "you're getting solid on this" or "this needs more work."
- Progress is felt, not displayed.

STUDENT EVIDENCE BLOCK (always present, always latest):
<student_evidence>
{{STUDENT_EVIDENCE}}
</student_evidence>

RESPONSE FORMAT — always a valid JSON object:
{
  "reply": "Your conversational message to the student",
  "action": "lesson|quiz|practice|diagnostic|exam|review|mistake_clinic|challenge|mastery_check|null",
  "action_config": { "concept": "...", "subject": "...", "exam": "...", "difficulty": "...", "count": 5, "duration": 600, "pattern": "..." } | null,
  "note_offer": "Save this as a note for later?" | null,
  "report": null | { "type": "evidence", ... },
  "memory_updates": [ { "type": "set|update|append", "key": "...", "value": "..." } ] | []
}

RULES:
- If you detect a misunderstanding, use action "mistake_clinic" and set the pattern.
- If mastery is high and spaced review is due, use action "review".
- If the student asks to be tested, use action "quiz".
- If the student asks for an exam, use action "exam".
- Keep replies conversational, encouraging, and concise (2-4 sentences max unless teaching).
- Always set action to something useful. Never leave action as null if there's a clear next step.
- When launching a lesson, set action_config.subject and action_config.concept from the evidence.
- When the student completes work and you see results, update mastery via memory_updates.
- If this is the FIRST message (no evidence yet), greet warmly and ask what they're preparing for.`;

export function buildMessages(userMessage, conversationHistory = [], studentEvidence = '') {
  return [
    { role: 'system', content: SYSTEM.replace('{{STUDENT_EVIDENCE}}', studentEvidence || 'No prior evidence — fresh student.') },
    ...conversationHistory.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : m.content?.reply || JSON.stringify(m.content),
    })),
    { role: 'user', content: userMessage },
  ];
}

function parseAlphaResult(result) {
  return {
    reply: result.reply || "I'm here to help. Tell me what you'd like to learn!",
    action: result.action || null,
    action_config: result.action_config || null,
    note_offer: result.note_offer || null,
    report: result.report || null,
    memory_updates: result.memory_updates || [],
  };
}

/** Main entry point — called by Home.jsx send() */
export async function getAlphaResponse({ userMessage, history, memorySummary, attachments }) {
  const messages = buildMessages(
    userMessage,
    history || [],
    memorySummary || ''
  );

  // Add attachment info if present
  if (attachments && attachments.length > 0) {
    const attachInfo = attachments.map(a => `[Attachment: ${a.name || 'file'}]`).join(', ');
    messages.push({ role: 'user', content: `The student also shared: ${attachInfo}` });
  }

  const result = await invokeLLM({
    messages,
    response_json_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        action: { type: ['string', 'null'] },
        action_config: { type: ['object', 'null'] },
        note_offer: { type: ['string', 'null'] },
        report: { type: ['object', 'null'] },
        memory_updates: { type: 'array' },
      },
      required: ['reply'],
    },
  });
  return parseAlphaResult(result);
}

/** Analyze portal result after student completes a quiz/exam/etc */
export async function analyzeResult({ portalType, concept, results, history }) {
  const result = await invokeLLM({
    messages: [
      ...(history || []).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      {
        role: 'user',
        content: `The student just completed a ${portalType} on "${concept}". Results:\n${JSON.stringify(results)}\n\nAnalyze their performance. Provide a conversational summary of what they got right, what they need to work on, and what to do next. Set appropriate memory_updates.`,
      },
    ],
    response_json_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        action: { type: ['string', 'null'] },
        action_config: { type: ['object', 'null'] },
        note_offer: { type: ['string', 'null'] },
        report: { type: ['object', 'null'] },
        memory_updates: { type: 'array' },
      },
      required: ['reply'],
    },
  });
  return parseAlphaResult(result);
}

/** Welcome back message for returning student */
export async function welcomeBack({ history, memorySummary }) {
  const result = await invokeLLM({
    messages: [
      ...((history || []).slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }))),
      {
        role: 'user',
        content: 'The student is returning. Welcome them back. Based on their evidence, suggest what they should pick up next.',
      },
    ],
    response_json_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        action: { type: ['string', 'null'] },
        action_config: { type: ['object', 'null'] },
        note_offer: { type: ['string', 'null'] },
        report: { type: ['object', 'null'] },
        memory_updates: { type: 'array' },
      },
      required: ['reply'],
    },
  });
  return parseAlphaResult(result);
}

/** Generate lesson content */
export async function generateLessonContent(concept, subject, exam) {
  return await invokeLLM({
    messages: [
      { role: 'user', content: `Create an interactive lesson on "${concept}"${subject ? ` in ${subject}` : ''}${exam ? ` for ${exam}` : ''}. Include: explanation, key points, examples, and a quick check question. Make it engaging and clear.` },
    ],
    response_json_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        key_points: { type: 'array', items: { type: 'string' } },
        examples: { type: 'array', items: { type: 'string' } },
        check_question: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            correct_index: { type: 'integer' },
            explanation: { type: 'string' },
          },
        },
      },
      required: ['title', 'content'],
    },
  });
}

/** Analyze post-portal results */
export async function analyzePostPortal(portalType, concept, results) {
  return await invokeLLM({
    messages: [
      { role: 'user', content: `Analyze this ${portalType} result for concept "${concept}":\n${JSON.stringify(results)}\n\nProvide: analysis, areas of strength, areas to improve, and suggested next action.` },
    ],
    response_json_schema: {
      type: 'object',
      properties: {
        analysis: { type: 'string' },
        strength_areas: { type: 'array', items: { type: 'string' } },
        weakness_areas: { type: 'array', items: { type: 'string' } },
        mastery_estimate: { type: 'number' },
        next_action: { type: 'string' },
      },
      required: ['analysis'],
    },
  });
}

/** Teach a lesson — used by LessonPortal */
export async function teachLesson(config = {}) {
  const { concept, subject, exam } = config;
  const result = await invokeLLM({
    messages: [
      {
        role: 'user',
        content: `Create a structured interactive lesson on "${concept || 'general knowledge'}"${subject ? ` in ${subject}` : ''}${exam ? ` for ${exam}` : ''}. Return JSON with: title, sections (array of {kind: analogy|explanation|example|trap|compare|memory|exam, heading, body}), check_question ({question, options, correct_index, explanation}).`,
      },
    ],
  });
  // Normalize result
  if (result.title && result.sections) return result;
  return {
    title: result.title || concept || 'Lesson',
    sections: result.sections || [
      { kind: 'explanation', heading: 'Overview', body: JSON.stringify(result) },
    ],
    check_question: result.check_question || null,
  };
}

export { invokeLLM };
