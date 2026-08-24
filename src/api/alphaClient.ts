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

class EntityClient<T> {
  private basePath: string;

  constructor(entityPath: string) {
    this.basePath = `/api/entities/${entityPath}`;
  }

  /**
   * List records — matches db.entities.X.list(sort, limit)
   */
  async list(sort: string = '-created_date', limit: number = 200): Promise<T[]> {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    return request<T[]>('GET', `${this.basePath}/list?${params}`);
  }

  /**
   * Get by ID — matches db.entities.X.get(id)
   */
  async get(id: string): Promise<T | null> {
    try {
      return await request<T>('GET', `${this.basePath}/${id}`);
    } catch {
      return null;
    }
  }

  /**
   * Filter records — matches db.entities.X.filter(query, sort, limit)
   */
  async filter(
    query: Record<string, unknown>,
    sort: string = '-created_date',
    limit: number = 100
  ): Promise<T[]> {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    return request<T[]>('GET', `${this.basePath}/filter?${params}`);
  }

  /**
   * Create — matches db.entities.X.create(data)
   */
  async create(data: Partial<T>): Promise<T> {
    return request<T>('POST', this.basePath, data);
  }

  /**
   * Update — matches db.entities.X.update(id, data)
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    return request<T>('PUT', `${this.basePath}/${id}`, data);
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
    ConversationMessage: new EntityClient<any>('conversation-messages'),
    LearningRecord: new EntityClient<any>('learning-records'),
    Mistake: new EntityClient<any>('mistakes'),
    Mission: new EntityClient<any>('missions'),
    Note: new EntityClient<any>('notes'),
    Question: new EntityClient<any>('questions'),
    PortalSession: new EntityClient<any>('portal-sessions'),
    Concept: new EntityClient<any>('concepts'),
    User: new EntityClient<any>('users'),
  },
};

export default db;
