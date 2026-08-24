import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function llmRoutes(app: FastifyInstance) {
  app.post('/api/llm/invoke', async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return reply.status(500).send({
        success: false,
        error: 'GROQ_API_KEY not configured on server',
      });
    }

    const body = request.body as any;
    const { prompt, response_json_schema, file_urls } = body;

    if (!prompt) {
      return reply.status(400).send({
        success: false,
        error: 'prompt is required',
      });
    }

    try {
      // Build messages for Groq
      const messages: any[] = [
        { role: 'user', content: prompt }
      ];

      // Build request body
      const requestBody: any = {
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      };

      // If JSON schema is requested, add response format
      if (response_json_schema) {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Groq API error:', response.status, errorData);
        return reply.status(502).send({
          success: false,
          error: `Groq API error: ${response.status}`,
        });
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '';

      // Parse JSON if schema was requested
      if (response_json_schema) {
        try {
          // Try to extract JSON from the response (might be wrapped in markdown)
          let jsonStr = content;
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
          }
          // Also try to find raw JSON
          const firstBrace = jsonStr.indexOf('{');
          const lastBrace = jsonStr.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
          }
          const parsed = JSON.parse(jsonStr);
          return reply.send({ success: true, data: parsed });
        } catch {
          // If JSON parsing fails, return the raw content
          return reply.send({ success: true, data: { reply: content } });
        }
      }

      return reply.send({ success: true, data: content });
    } catch (error: any) {
      console.error('LLM invocation error:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'LLM invocation failed',
      });
    }
  });
}
