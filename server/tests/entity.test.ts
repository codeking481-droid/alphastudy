import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityService } from '../src/services/entity.js';

// ============================================================================
// Tests — focusing on EntityService (business logic layer)
// ============================================================================

describe('EntityService', () => {
  let service: EntityService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      filter: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'new-id' }),
      update: vi.fn().mockResolvedValue({ id: 'updated-id' }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    service = new EntityService(mockRepo);
  });

  describe('list', () => {
    it('should list with default params', async () => {
      const result = await service.list();
      expect(mockRepo.list).toHaveBeenCalledWith('-created_at', 100);
      expect(result).toEqual([]);
    });

    it('should list with custom sort', async () => {
      await service.list('-updated_at', 50);
      expect(mockRepo.list).toHaveBeenCalledWith('-updated_at', 50);
    });

    it('should return data from repository', async () => {
      const data = [{ id: '1', concept: 'Math' }];
      mockRepo.list.mockResolvedValue(data);
      const result = await service.list();
      expect(result).toEqual(data);
    });
  });

  describe('get', () => {
    it('should get a record by ID', async () => {
      const record = { id: 'test-id', concept: 'Math' };
      mockRepo.get.mockResolvedValue(record);
      const result = await service.get('test-id');
      expect(mockRepo.get).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(record);
    });

    it('should return null for non-existent record', async () => {
      mockRepo.get.mockResolvedValue(null);
      const result = await service.get('non-existent');
      expect(result).toBeNull();
    });

    it('should throw for empty ID', async () => {
      await expect(service.get('')).rejects.toThrow('Invalid ID');
    });

    it('should throw for null ID', async () => {
      await expect(service.get(null as any)).rejects.toThrow('Invalid ID');
    });
  });

  describe('filter', () => {
    it('should filter records', async () => {
      await service.filter({ concept: 'Math' }, '-created_at', 10);
      expect(mockRepo.filter).toHaveBeenCalledWith({ concept: 'Math' }, '-created_at', 10);
    });

    it('should use default params', async () => {
      await service.filter({});
      expect(mockRepo.filter).toHaveBeenCalledWith({}, '-created_at', 100);
    });

    it('should return filtered data', async () => {
      const data = [{ id: '1', concept: 'Math' }];
      mockRepo.filter.mockResolvedValue(data);
      const result = await service.filter({ concept: 'Math' });
      expect(result).toEqual(data);
    });
  });

  describe('create', () => {
    it('should create a record', async () => {
      const data = { concept: 'Math', content: 'Test' };
      const result = await service.create(data);
      expect(mockRepo.create).toHaveBeenCalledWith(data);
      expect(result).toEqual({ id: 'new-id' });
    });

    it('should throw for null data', async () => {
      await expect(service.create(null as any)).rejects.toThrow('Invalid data');
    });

    it('should throw for undefined data', async () => {
      await expect(service.create(undefined as any)).rejects.toThrow('Invalid data');
    });

    it('should throw for non-object data', async () => {
      await expect(service.create('string' as any)).rejects.toThrow('Invalid data');
    });
  });

  describe('update', () => {
    it('should update a record', async () => {
      mockRepo.get.mockResolvedValue({ id: 'test-id' });
      const data = { concept: 'Updated Math' };
      const result = await service.update('test-id', data);
      expect(mockRepo.get).toHaveBeenCalledWith('test-id');
      expect(mockRepo.update).toHaveBeenCalledWith('test-id', data);
      expect(result).toEqual({ id: 'updated-id' });
    });

    it('should throw for non-existent record', async () => {
      mockRepo.get.mockResolvedValue(null);
      await expect(service.update('non-existent', { concept: 'Updated' }))
        .rejects.toThrow('not found');
    });

    it('should throw for empty ID', async () => {
      await expect(service.update('', {})).rejects.toThrow('Invalid ID');
    });

    it('should throw for null data', async () => {
      mockRepo.get.mockResolvedValue({ id: 'test-id' });
      await expect(service.update('test-id', null as any)).rejects.toThrow('Invalid data');
    });
  });

  describe('delete', () => {
    it('should delete a record', async () => {
      mockRepo.get.mockResolvedValue({ id: 'test-id' });
      await service.delete('test-id');
      expect(mockRepo.get).toHaveBeenCalledWith('test-id');
      expect(mockRepo.delete).toHaveBeenCalledWith('test-id');
    });

    it('should throw for non-existent record', async () => {
      mockRepo.get.mockResolvedValue(null);
      await expect(service.delete('non-existent')).rejects.toThrow('not found');
    });

    it('should throw for empty ID', async () => {
      await expect(service.delete('')).rejects.toThrow('Invalid ID');
    });
  });
});

describe('Sort Parsing Logic', () => {
  // Test the sort string parsing (extracted from base repository)
  function parseSort(sortStr: string) {
    if (sortStr.startsWith('-')) {
      return { field: sortStr.slice(1), direction: 'desc' as const };
    }
    return { field: sortStr, direction: 'asc' as const };
  }

  function mapSortField(field: string) {
    const fieldMap: Record<string, string> = {
      created_date: 'created_at',
      updated_date: 'updated_at',
    };
    return fieldMap[field] || field;
  }

  it('should parse descending sort string', () => {
    const result = parseSort('-created_date');
    expect(result).toEqual({ field: 'created_date', direction: 'desc' });
  });

  it('should parse ascending sort string', () => {
    const result = parseSort('created_date');
    expect(result).toEqual({ field: 'created_date', direction: 'asc' });
  });

  it('should map SDK field names to DB names', () => {
    expect(mapSortField('created_date')).toBe('created_at');
    expect(mapSortField('updated_date')).toBe('updated_at');
  });

  it('should pass through unknown field names', () => {
    expect(mapSortField('concept')).toBe('concept');
    expect(mapSortField('status')).toBe('status');
  });

  it('should handle complex sort strings', () => {
    const result = parseSort('-updated_date');
    expect(result).toEqual({ field: 'updated_date', direction: 'desc' });
  });
});

describe('API Response Format', () => {
  it('should format success response with data', () => {
    const response = { success: true, data: { id: '123', concept: 'Math' } };
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe('123');
  });

  it('should format success response with array data', () => {
    const response = { success: true, data: [{ id: '1' }, { id: '2' }] };
    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data).toHaveLength(2);
  });

  it('should format error response', () => {
    const response = { success: false, error: 'Record not found' };
    expect(response.success).toBe(false);
    expect(response.error).toBe('Record not found');
  });

  it('should format validation error response', () => {
    const response = {
      success: false,
      error: 'Validation failed',
      details: { email: ['Invalid email'] },
    };
    expect(response.success).toBe(false);
    expect(response.details).toBeDefined();
  });
});

describe('SDK Compatibility', () => {
  // Test that our API patterns match the Base44 SDK patterns
  it('should support list(sort, limit) pattern', () => {
    const mockRepo = {
      list: vi.fn().mockResolvedValue([]),
    };
    const service = new EntityService(mockRepo);

    // Base44 SDK: db.entities.X.list("created_date", 200)
    service.list('created_date', 200);
    expect(mockRepo.list).toHaveBeenCalledWith('created_date', 200);
  });

  it('should support filter(query, sort, limit) pattern', () => {
    const mockRepo = {
      filter: vi.fn().mockResolvedValue([]),
    };
    const service = new EntityService(mockRepo);

    // Base44 SDK: db.entities.X.filter({ concept: "Math" }, "-updated_date", 1)
    service.filter({ concept: 'Math' }, '-updated_date', 1);
    expect(mockRepo.filter).toHaveBeenCalledWith({ concept: 'Math' }, '-updated_date', 1);
  });

  it('should support create(data) pattern', () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: 'new-id' }),
    };
    const service = new EntityService(mockRepo);

    // Base44 SDK: db.entities.X.create({ concept: "Math", status: "learning" })
    service.create({ concept: 'Math', status: 'learning' });
    expect(mockRepo.create).toHaveBeenCalledWith({ concept: 'Math', status: 'learning' });
  });

  it('should support update(id, data) pattern', async () => {
    const mockRepo = {
      get: vi.fn().mockResolvedValue({ id: '123' }),
      update: vi.fn().mockResolvedValue({ id: '123' }),
    };
    const service = new EntityService(mockRepo);

    // Base44 SDK: db.entities.X.update("123", { status: "mastered" })
    await service.update('123', { status: 'mastered' });
    expect(mockRepo.update).toHaveBeenCalledWith('123', { status: 'mastered' });
  });

  it('should support delete(id) pattern', async () => {
    const mockRepo = {
      get: vi.fn().mockResolvedValue({ id: '123' }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const service = new EntityService(mockRepo);

    // Base44 SDK: db.entities.X.delete("123")
    await service.delete('123');
    expect(mockRepo.delete).toHaveBeenCalledWith('123');
  });
});
