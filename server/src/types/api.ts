// ============================================================================
// API Types — mirrors the Base44 SDK entity operations
// ============================================================================

// Base query types
export interface ListQuery {
  sort?: string;      // Field name, prefix "-" for descending
  limit?: number;
}

export interface FilterQuery extends ListQuery {
  [key: string]: unknown; // Field-level filters
}

// Standard API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
}

// Pagination info (for future use)
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Entity input types (what the client sends)
// ============================================================================

export interface CreateUserInput {
  email: string;
  password?: string;
  role?: 'admin' | 'user';
}

export interface CreateConversationMessageInput {
  role: 'user' | 'alpha' | 'system';
  content: string;
  action?: Record<string, unknown>;
  noteOffer?: { title: string; content: string; concept: string };
  report?: Record<string, unknown>;
  attachments?: string[];
  kind?: string;
}

export interface CreateLearningRecordInput {
  concept: string;
  exam?: string;
  subject?: string;
  status?: string;
  attempts?: number;
  correct?: number;
  lastScore?: number;
  masteryScore?: number;
  streak?: number;
  lastReviewed?: string;
  nextReview?: string;
  preferredStyle?: string;
  weakPatterns?: string[];
  seenQuestions?: string[];
}

export interface CreateMistakeInput {
  concept: string;
  questionText: string;
  studentAnswer?: string;
  correctAnswer?: string;
  pattern?: string;
  portalType?: string;
}

export interface CreateMissionInput {
  goal: string;
  exam?: string;
  deadline?: string;
  totalMinutes?: number;
  steps?: Array<{
    label: string;
    portal: string;
    concept: string;
    duration_minutes: number;
    question_count: number;
    difficulty: string;
  }>;
  currentStep?: number;
  status?: string;
}

export interface CreateNoteInput {
  title: string;
  content: string;
  concept?: string;
  subject?: string;
  tags?: string[];
}

export interface CreateQuestionInput {
  concept: string;
  exam?: string;
  subject?: string;
  topic?: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: string;
  provenance?: string;
  sourceLabel?: string;
}

export interface CreatePortalSessionInput {
  portalType: string;
  concept?: string;
  config?: Record<string, unknown>;
  status?: string;
  result?: Record<string, unknown>;
}

export interface CreateConceptInput {
  concept: string;
  subject?: string;
  exam?: string;
  prerequisites?: string[];
}

// ============================================================================
// Update input types (partial)
// ============================================================================

export type UpdateLearningRecordInput = Partial<CreateLearningRecordInput>;
export type UpdateMissionInput = Partial<CreateMissionInput>;
export type UpdatePortalSessionInput = Partial<CreatePortalSessionInput>;
export type UpdateNoteInput = Partial<CreateNoteInput>;
export type UpdateConversationMessageInput = Partial<CreateConversationMessageInput>;

// ============================================================================
// SDK-compatible operation types
// ============================================================================

export interface SdkListOperation {
  sort: string;
  limit: number;
}

export interface SdkFilterOperation {
  query: Record<string, unknown>;
  sort: string;
  limit: number;
}
