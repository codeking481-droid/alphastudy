import { BaseRepository } from './base.js';
import * as schema from '../db/schema/index.js';

// ============================================================================
// Entity Repositories
// ============================================================================

export class ConversationMessageRepository extends BaseRepository {
  constructor() {
    super(schema.conversationMessages, 'conversation_messages');
  }

  async list(sort: string = '-created_at', limit: number = 200) {
    return super.list(sort, limit);
  }
}

export class LearningRecordRepository extends BaseRepository {
  constructor() {
    super(schema.learningRecords, 'learning_records');
  }

  async list(sort: string = '-updated_date', limit: number = 200) {
    const dbSort = sort.replace('updated_date', 'updated_at');
    return super.list(dbSort, limit);
  }

  async filter(
    query: Record<string, unknown>,
    sort: string = '-updated_date',
    limit: number = 200
  ) {
    const dbSort = sort.replace('updated_date', 'updated_at');
    return super.filter(query, dbSort, limit);
  }
}

export class MistakeRepository extends BaseRepository {
  constructor() {
    super(schema.mistakes, 'mistakes');
  }

  async list(sort: string = '-created_date', limit: number = 50) {
    return super.list(sort, limit);
  }
}

export class MissionRepository extends BaseRepository {
  constructor() {
    super(schema.missions, 'missions');
  }
}

export class NoteRepository extends BaseRepository {
  constructor() {
    super(schema.notes, 'notes');
  }

  async list(sort: string = '-created_date', limit: number = 200) {
    return super.list(sort, limit);
  }
}

export class QuestionRepository extends BaseRepository {
  constructor() {
    super(schema.questions, 'questions');
  }
}

export class PortalSessionRepository extends BaseRepository {
  constructor() {
    super(schema.portalSessions, 'portal_sessions');
  }
}

export class ConceptRepository extends BaseRepository {
  constructor() {
    super(schema.concepts, 'concepts');
  }

  async list(sort: string = '-created_date', limit: number = 200) {
    return super.list(sort, limit);
  }
}

export class UserRepository extends BaseRepository {
  constructor() {
    super(schema.users, 'users');
  }
}

// ============================================================================
// Singleton instances
// ============================================================================

export const conversationMessages = new ConversationMessageRepository();
export const learningRecords = new LearningRecordRepository();
export const mistakes = new MistakeRepository();
export const missions = new MissionRepository();
export const notes = new NoteRepository();
export const questions = new QuestionRepository();
export const portalSessions = new PortalSessionRepository();
export const concepts = new ConceptRepository();
export const users = new UserRepository();
