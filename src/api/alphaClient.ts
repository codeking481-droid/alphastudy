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
  const json = await res.json() as { success: boolean; data?: T; error?: string };

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
    async register(email: string, password: string) {
      const data = await request<any>('POST', '/api/auth/register', { email, password });
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
};

export default db;
