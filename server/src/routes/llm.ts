import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const FALLBACK_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

async function callGroq(model: string, body: any, apiKey: string) {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, model }),
  });
  const text = await res.text();
  return { res, text };
}

export async function llmRoutes(app: FastifyInstance) {
  app.post('/api/llm/invoke', async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('LLM proxy: GROQ_API_KEY not set');
      return reply.status(500).send({ success: false, error: 'AI not configured. GROQ_API_KEY is missing on the server.' });
    }

    const body = request.body as any;
    const { prompt, messages, response_json_schema } = body;

    // Build messages array — accept either `messages` array or `prompt` string
    let chatMessages: any[] = [];
    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages.map((m: any) => ({
        role: m.role || 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));
    } else if (typeof prompt === 'string' && prompt.trim()) {
      // Parse formatted prompt like "[system]: ...\n\n[user]: ..."
      const parts = prompt.split(/\n\n(?=\[(?:system|user|assistant)\]:)/);
      if (parts.length > 1) {
        chatMessages = parts.map((part: string) => {
          const match = part.match(/^\[(system|user|assistant)\]:\s*([\s\S]*)$/);
          if (match) {
            return { role: match[1], content: match[2].trim() };
          }
          return { role: 'user', content: part.trim() };
        });
      } else {
        chatMessages = [{ role: 'user', content: prompt }];
      }
    } else {
      return reply.status(400).send({ success: false, error: 'prompt or messages array is required' });
    }

    // Build base request (without model)
    const baseBody: any = {
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 4096,
    };
    if (response_json_schema) baseBody.response_format = { type: 'json_object' };

    const models = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter(m => m !== PRIMARY_MODEL)];
    let lastError = '';
    for (const model of models) {
      try {
        const { res, text } = await callGroq(model, baseBody, apiKey);
        if (!res.ok) {
          lastError = text.substring(0, 500);
          console.error(`Groq ${model} error ${res.status}:`, lastError);
          if (res.status === 429 || res.status === 502 || res.status === 529) {
            if (model !== models[models.length - 1]) {
              console.log(`→ Retrying with fallback ${models[models.indexOf(model) + 1]}`);
              continue;
            }
            return reply.status(429).send({ success: false, error: `Groq rate limited on ${model}. Please wait 30s and try again.` });
          }
          return reply.status(502).send({ success: false, error: `Groq API error: ${res.status}` });
        }
        let data: any;
        try { data = JSON.parse(text); } catch { return reply.status(502).send({ success: false, error: 'Groq returned invalid JSON' }); }
        const content = data.choices?.[0]?.message?.content || '';
        if (!content) {
          console.error(`Groq ${model} empty content`, JSON.stringify(data).substring(0, 500));
          continue;
        }
        if (model !== PRIMARY_MODEL) console.log(`✅ Groq fallback ${model} succeeded`);
        if (response_json_schema) {
          try {
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) jsonStr = jsonMatch[1].trim();
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(jsonStr);
            return reply.send({ success: true, data: parsed });
          } catch {
            return reply.send({ success: true, data: { reply: content } });
          }
        }
        return reply.send({ success: true, data: content });
      } catch (error: any) {
        lastError = error.message;
        console.error(`LLM proxy error on ${model}:`, error.message);
        if (model === models[models.length - 1]) return reply.status(500).send({ success: false, error: `LLM proxy failed: ${lastError}` });
      }
    }
    return reply.status(500).send({ success: false, error: `LLM proxy failed: ${lastError}` });
  });
}
