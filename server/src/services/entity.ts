import type { BaseRepository } from '../repositories/base.js';

// ============================================================================
// Generic Entity Service — wraps repository with validation and error handling
// ============================================================================

export class EntityService {
  private repo: BaseRepository;

  constructor(repo: BaseRepository) {
    this.repo = repo;
  }

  async list(sort: string = '-created_at', limit: number = 100): Promise<any[]> {
    return this.repo.list(sort, limit);
  }

  async get(id: string): Promise<any | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid ID');
    }
    return this.repo.get(id);
  }

  async filter(
    query: Record<string, unknown>,
    sort: string = '-created_at',
    limit: number = 100
  ): Promise<any[]> {
    return this.repo.filter(query, sort, limit);
  }

  async create(data: any): Promise<any> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data');
    }
    return this.repo.create(data);
  }

  async update(id: string, data: any): Promise<any> {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid ID');
    }
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data');
    }
    const existing = await this.repo.get(id);
    if (!existing) {
      throw new Error('Record not found');
    }
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid ID');
    }
    const existing = await this.repo.get(id);
    if (!existing) {
      throw new Error('Record not found');
    }
    await this.repo.delete(id);
  }
}
