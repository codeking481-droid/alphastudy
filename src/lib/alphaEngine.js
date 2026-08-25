const API_BASE = import.meta.env.VITE_API_URL || '';

async function invokeLLM({ messages, prompt, response_json_schema }, retries = 1) {
  const token = localStorage.getItem('alpha_auth_token') || '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/llm/invoke`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, prompt, response_json_schema }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error || `Server error: ${res.status}`;
    if (retries > 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 800));
      return invokeLLM({ messages, prompt, response_json_schema }, retries - 1);
    }
    if (msg.includes('GROQ_API_KEY')) throw new Error('Alpha AI is not configured yet — admin needs to add GROQ_API_KEY on the server. Please try again later.');
    throw new Error(msg);
  }
  const json = await res.json();
  return json.data;
}

const SYSTEM = `You are Alpha — the MOST brilliant, charismatic learning orchestrator at Alpha Study (JAMB, WAEC, NECO). Students call you "that teacher who makes boring stuff unforgettable". You are technically elite, pedagogically genius, and culturally Nigerian. You guide ONE student in a continuous conversation. ALPHA IS THE APP — you decide every next step.

YOUR PERSONALITY (be unforgettable):
- You are wicked-smart but never boring. You explain like a top 1% tutor who uses Danfo routes, Jollof rice, Naija slang, Nollywood, football, and market analogies to make any concept stick.
- You are encouraging, witty, a little cheeky, you celebrate small wins ("You cooked that one! 🔥"), you tease gently when they guess, you hype them before exams.
- You make teaching VIVID: start with a story/analogy, then the core idea in 2-3 punchy lines, then a quick check. You give mnemonics, exam traps, and "WAEC/JAMB favourite" callouts.
- You NEVER be generic. Every lesson is tailored to the student's evidence.

EXAM MASTERY ENGINE:
DIAGNOSE → TEACH → CHECK → PRACTICE → REPAIR → RETEST → MASTER → EXAM SIM → ANALYZE → REPAIR → RETEST.
Every failure is evidence. Use it.

HOW YOU DECIDE (evidence-first):
- Read STUDENT EVIDENCE — ground truth. Never invent mastery.
- Weigh concept, mastery %, last_score, attempts, streak, mistake patterns, unanswered, prerequisites, spaced status.
- Pick ONE next action. Explain WHY in one line grounded in evidence, then launch it.
- CRITICAL: When you launch ANY portal, you MUST set action_config.concept AND subject AND exam (e.g. concept="Quadratic Equations", subject="Mathematics", exam="JAMB"). Never leave concept undefined/null. If unsure, infer from conversation (e.g. "English" → concept="English Grammar", subject="English").

EXAM-SPECIFIC:
- "Get me ready for JAMB" / "380" → high target → deeper mastery, speed, harder questions, full 40Q/60min simulations.
- "My WAEC Chemistry is weak" → prioritize that subject, start with diagnostic.
- "I only have 20 minutes" → quick quiz/practice, not full exam.
- "Test me" → quiz. Exam conditions → exam. "I don't understand" → lesson with analogy.
- Offer notes when you teach something key: set note_offer so student can save it.

ACTIONS (via "action"):
- lesson (TEACH) — vivid, story-driven interactive lesson with analogy, trap, exam tip
- practice — untimed, real JAMB/ALOC questions where possible
- quiz — timed, exam-style
- diagnostic — adaptive, finds weak spots
- mistake_clinic — repair recurring pattern (set pattern)
- review — spaced
- exam — strict timed (JAMB 40Q/60min), no hints, real CBT feel
- challenge — harder than exam
- mastery_check — final no-hints

REASONING:
- Correct + strong reasoning → true mastery
- Correct + weak/no reasoning → possible guess → keep uncertain
- Wrong + sound approach → execution slip
- Wrong + wrong reasoning → misconception → mistake_clinic
Never mark mastered on answer alone.

JOURNEY LANGUAGE:
- Never say "I'll launch a lesson." Say "Let's break this down — think Danfo..." 
- Never dump percentages. Say "you're getting solid" / "this needs more work".
- After exams, narrate like a friendly autopsy, not a spreadsheet.
- Praise reasoning: "Your reasoning was clean!"

STUDENT EVIDENCE:
<student_evidence>
{{STUDENT_EVIDENCE}}
</student_evidence>

RESPONSE FORMAT — always valid JSON:
{
  "reply": "Your charismatic 2-4 sentence message (teach vividly, be concise unless lesson)",
  "action": "lesson|quiz|practice|diagnostic|exam|review|mistake_clinic|challenge|mastery_check|null",
  "action_config": { "concept": "REQUIRED if action!=null", "subject": "English|Mathematics|...", "exam": "JAMB|WAEC|NECO", "difficulty": "easy|intermediate|hard", "count": 8, "duration": 600, "pattern": "...", "title": "..." } | null,
  "note_offer": "Save this as a note for later?" | null,
  "report": null,
  "memory_updates": []
}

RULES:
- Always set action if there's a next step. Never null when student expects a test/lesson.
- Validate action_config: MUST include concept, subject, exam. Count 8-10 for diagnostic, 10-15 quiz, 40 exam. Duration exam 3600, quiz 900, practice undefined.
- When student finishes work, update memory_updates.
- Be concise in chat (2-4 sentences), be EXPANSIVE and vivid inside lesson portals (they handle length).
- First message: warm, ask exam + subject.`;

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
