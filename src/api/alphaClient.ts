const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('alpha_auth_token');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);

  // Read the raw text first so we can handle both JSON and non-JSON responses
  const text = await res.text();

  // Check if the response is HTML (server returned a page instead of JSON)
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html') || text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) {
    throw new Error(
      `Server returned an HTML page instead of JSON for ${method} ${path}. ` +
      `The API server may be down or the endpoint ${path} does not exist. ` +
      `Make sure the backend server is running and connected to the database.`
    );
  }

  let json: any;
  try {
    json = JSON.parse(text) as { success: boolean; data?: T; error?: string };
  } catch {
    throw new Error(
      `Invalid JSON response from ${method} ${path}. ` +
      `The server returned: "${text.substring(0, 200)}"`
    );
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.data as T;
}

class EntityClient {
  private basePath: string;
  constructor(entityPath: string) { this.basePath = `/api/entities/${entityPath}`; }

  async list(sort = '-created_at', limit = 200) {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    return request<any[]>('GET', `${this.basePath}/list?${params}`);
  }
  async get(id: string) {
    try { return await request<any>('GET', `${this.basePath}/${id}`); } catch { return null; }
  }
  async filter(query: Record<string, unknown>, sort = '-created_at', limit = 100) {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    return request<any[]>('GET', `${this.basePath}/filter?${params}`);
  }
  async create(data: Record<string, unknown>) { return request<any>('POST', this.basePath, data); }
  async update(id: string, data: Record<string, unknown>) { return request<any>('PUT', `${this.basePath}/${id}`, data); }
  async delete(id: string) { await request('DELETE', `${this.basePath}/${id}`); }
}

export const db = {
  auth: {
    async register(payload: { email: string; password: string; firstName?: string; middleName?: string; lastName?: string }) {
      const data = await request<any>('POST', '/api/auth/register', payload);
      localStorage.setItem('alpha_auth_token', data.token);
      localStorage.setItem('alpha_auth_user', JSON.stringify(data.user));
      return data;
    },
    async login(email: string, password: string) {
      const data = await request<any>('POST', '/api/auth/login', { email, password });
      localStorage.setItem('alpha_auth_token', data.token);
      localStorage.setItem('alpha_auth_user', JSON.stringify(data.user));
      return data;
    },
    logout() {
      localStorage.removeItem('alpha_auth_token');
      localStorage.removeItem('alpha_auth_user');
    },
    async me() {
      return request<any>('GET', '/api/auth/me');
    },
    async forgotPassword(email: string) {
      return request<any>('POST', '/api/auth/forgot-password', { email });
    },
    async resetPassword(resetToken: string, newPassword: string) {
      return request<any>('POST', '/api/auth/reset-password', { resetToken, newPassword });
    },
  },
  entities: {
    ConversationMessage: new EntityClient('conversation-messages'),
    LearningRecord: new EntityClient('learning-records'),
    Mistake: new EntityClient('mistakes'),
    Mission: new EntityClient('missions'),
    Note: new EntityClient('notes'),
    Question: new EntityClient('questions'),
    PortalSession: new EntityClient('portal-sessions'),
    Concept: new EntityClient('concepts'),
    User: new EntityClient('users'),
    ReasoningTranscript: new EntityClient('reasoning-transcripts'),
  },
  llm: {
    async invoke(prompt: string, response_json_schema?: any) {
      return request<any>('POST', '/api/llm/invoke', { prompt, response_json_schema });
    },
  },
  aloc: {
    async questions(params: { subject?: string; examType?: string; year?: string; limit?: number }) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) qs.set(k, String(v));
      }
      return request<any>('GET', `/api/aloc/questions?${qs}`);
    },
    async health() {
      return request<any>('GET', '/api/aloc/health');
    },
    async sync(body: { subject?: string; examType?: string; year?: string }) {
      return request<any>('POST', '/api/aloc/sync', body);
    },
  },
  curriculum: {
    async getExams() {
      return request<any>('GET', '/api/curriculum/exams');
    },
    async getExam(code: string) {
      return request<any>('GET', `/api/curriculum/exams/${code}`);
    },
    async getSubjects(code: string) {
      return request<any>('GET', `/api/curriculum/exams/${code}/subjects`);
    },
  },
};

export default db;
