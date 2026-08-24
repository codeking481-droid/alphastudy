// ============================================================================
// Alpha Study API Client
// Drop-in replacement for Base44 SDK entity operations
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================================
// Types
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// HTTP Client
// ============================================================================

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const json = await res.json() as ApiResponse<T>;

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }

  return json.data as T;
}

// ============================================================================
// Entity Client — matches Base44 SDK patterns
// ============================================================================

class EntityClient {
  private basePath: string;

  constructor(entityPath: string) {
    this.basePath = `/api/entities/${entityPath}`;
  }

  /**
   * List records — matches db.entities.X.list(sort, limit)
   */
  async list(sort: string = '-created_at', limit: number = 200): Promise<any[]> {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    return request<any[]>('GET', `${this.basePath}/list?${params}`);
  }

  /**
   * Get by ID — matches db.entities.X.get(id)
   */
  async get(id: string): Promise<any | null> {
    try {
      return await request<any>('GET', `${this.basePath}/${id}`);
    } catch {
      return null;
    }
  }

  /**
   * Filter records — matches db.entities.X.filter(query, sort, limit)
   */
  async filter(
    query: Record<string, unknown>,
    sort: string = '-created_at',
    limit: number = 100
  ): Promise<any[]> {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    return request<any[]>('GET', `${this.basePath}/filter?${params}`);
  }

  /**
   * Create — matches db.entities.X.create(data)
   */
  async create(data: Record<string, unknown>): Promise<any> {
    return request<any>('POST', this.basePath, data);
  }

  /**
   * Update — matches db.entities.X.update(id, data)
   */
  async update(id: string, data: Record<string, unknown>): Promise<any> {
    return request<any>('PUT', `${this.basePath}/${id}`, data);
  }

  /**
   * Delete — matches db.entities.X.delete(id)
   */
  async delete(id: string): Promise<void> {
    await request('DELETE', `${this.basePath}/${id}`);
  }
}

// ============================================================================
// Entity Instances — drop-in replacements for Base44 SDK
// ============================================================================

export const db = {
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
};

export default db;
