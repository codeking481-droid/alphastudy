import { eq, desc, asc, SQL } from 'drizzle-orm';
import { getDb } from '../db/index.js';

// ============================================================================
// Base Repository — generic CRUD matching Base44 SDK patterns
// ============================================================================

export type SortDirection = 'asc' | 'desc';

function parseSort(sortStr: string): { field: string; direction: SortDirection } {
  if (sortStr.startsWith('-')) {
    return { field: sortStr.slice(1), direction: 'desc' };
  }
  return { field: sortStr, direction: 'asc' };
}

function mapSortField(field: string): string {
  const fieldMap: Record<string, string> = {
    created_date: 'created_at',
    updated_date: 'updated_at',
    createdDate: 'created_at',
    updatedDate: 'updated_at',
  };
  return fieldMap[field] || field;
}

export class BaseRepository {
  protected table: any;
  protected tableName: string;

  constructor(table: any, tableName: string) {
    this.table = table;
    this.tableName = tableName;
  }

  async list(sort: string = '-created_at', limit: number = 100): Promise<any[]> {
    const db = getDb();
    const { field, direction } = parseSort(sort);
    const dbField = mapSortField(field);
    const column = this.table[dbField] || this.table[field] || this.table.createdAt;
    const orderFn = direction === 'desc' ? desc : asc;
    return db.select().from(this.table).orderBy(orderFn(column)).limit(limit) as any;
  }

  async get(id: string): Promise<any | null> {
    const db = getDb();
    const result = await db.select().from(this.table).where(eq(this.table.id, id)).limit(1) as any;
    return result[0] || null;
  }

  async filter(
    query: Record<string, unknown>,
    sort: string = '-created_at',
    limit: number = 100
  ): Promise<any[]> {
    const db = getDb();
    const conditions: SQL[] = [];

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        const column = this.table[key];
        if (column) {
          conditions.push(eq(column, value as any));
        }
      }
    }

    const { field, direction } = parseSort(sort);
    const dbField = mapSortField(field);
    const column = this.table[dbField] || this.table[field] || this.table.createdAt;
    const orderFn = direction === 'desc' ? desc : asc;

    let q = db.select().from(this.table) as any;

    if (conditions.length > 0) {
      for (const cond of conditions) {
        q = q.where(cond);
      }
    }

    return q.orderBy(orderFn(column)).limit(limit);
  }

  async create(data: any): Promise<any> {
    const db = getDb();
    const result = await db.insert(this.table).values(data).returning() as any;
    return result[0];
  }

  async update(id: string, data: any): Promise<any> {
    const db = getDb();
    const result = await db
      .update(this.table)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(this.table.id, id))
      .returning() as any;
    return result[0];
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(this.table).where(eq(this.table.id, id));
  }
}
