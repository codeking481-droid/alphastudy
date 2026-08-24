import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ============================================================================
// Enums
// ============================================================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

export const learningStatusEnum = pgEnum('learning_status', [
  'not_started',
  'learning',
  'practiced',
  'mastered',
  'needs_review',
]);

export const mistakePatternEnum = pgEnum('mistake_pattern', [
  'sign_error',
  'formula_confusion',
  'misreading',
  'concept_confusion',
  'forgotten_prerequisite',
  'calculation_error',
  'careless',
  'time_pressure',
  'unknown',
]);

export const missionStatusEnum = pgEnum('mission_status', [
  'active',
  'completed',
  'abandoned',
]);

export const portalTypeEnum = pgEnum('portal_type', [
  'lesson',
  'quiz',
  'exam',
  'mistake_clinic',
  'review',
  'challenge',
  'practice',
  'diagnostic',
  'mastery_check',
  'image',
  'document',
  'voice',
]);

export const portalSessionStatusEnum = pgEnum('portal_session_status', [
  'active',
  'completed',
  'abandoned',
]);

export const messageRoleEnum = pgEnum('message_role', ['user', 'alpha', 'system']);

export const questionDifficultyEnum = pgEnum('question_difficulty', [
  'beginner',
  'intermediate',
  'advanced',
  'exam',
  'challenge',
]);

export const questionProvenanceEnum = pgEnum('question_provenance', [
  'verified_official',
  'third_party_sourced',
  'authored_practice',
  'ai_generated',
  'unknown',
]);

// ============================================================================
// Tables
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  middleName: varchar('middle_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  role: userRoleEnum('role').notNull().default('user'),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpires: timestamp('reset_token_expires', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const concepts = pgTable('concepts', {
  id: uuid('id').defaultRandom().primaryKey(),
  concept: varchar('concept', { length: 500 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  exam: varchar('exam', { length: 100 }),
  prerequisites: jsonb('prerequisites').$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const learningRecords = pgTable('learning_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  concept: varchar('concept', { length: 500 }).notNull(),
  exam: varchar('exam', { length: 100 }),
  subject: varchar('subject', { length: 255 }),
  status: learningStatusEnum('status').notNull().default('not_started'),
  attempts: integer('attempts').notNull().default(0),
  correct: integer('correct').notNull().default(0),
  lastScore: real('last_score').notNull().default(0),
  masteryScore: real('mastery_score').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  lastReviewed: timestamp('last_reviewed', { withTimezone: true }),
  nextReview: timestamp('next_review', { withTimezone: true }),
  preferredStyle: varchar('preferred_style', { length: 255 }),
  weakPatterns: jsonb('weak_patterns').$type<string[]>().default([]),
  seenQuestions: jsonb('seen_questions').$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mistakes = pgTable('mistakes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  concept: varchar('concept', { length: 500 }).notNull(),
  questionText: text('question_text').notNull(),
  studentAnswer: varchar('student_answer', { length: 500 }),
  correctAnswer: varchar('correct_answer', { length: 500 }),
  pattern: mistakePatternEnum('pattern').notNull().default('unknown'),
  portalType: varchar('portal_type', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const missions = pgTable('missions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  goal: text('goal').notNull(),
  exam: varchar('exam', { length: 100 }),
  deadline: varchar('deadline', { length: 100 }),
  totalMinutes: integer('total_minutes'),
  steps: jsonb('steps').$type<Array<{
    label: string;
    portal: string;
    concept: string;
    duration_minutes: number;
    question_count: number;
    difficulty: string;
  }>>().default([]),
  currentStep: integer('current_step').notNull().default(0),
  status: missionStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  concept: varchar('concept', { length: 500 }),
  subject: varchar('subject', { length: 255 }),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  concept: varchar('concept', { length: 500 }).notNull(),
  exam: varchar('exam', { length: 100 }),
  subject: varchar('subject', { length: 255 }),
  topic: varchar('topic', { length: 255 }),
  questionText: text('question_text').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctIndex: integer('correct_index').notNull(),
  explanation: text('explanation'),
  difficulty: questionDifficultyEnum('difficulty').notNull().default('intermediate'),
  provenance: questionProvenanceEnum('provenance').notNull().default('authored_practice'),
  sourceLabel: varchar('source_label', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const portalSessions = pgTable('portal_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  portalType: portalTypeEnum('portal_type').notNull(),
  concept: varchar('concept', { length: 500 }),
  config: jsonb('config').$type<Record<string, unknown>>(),
  status: portalSessionStatusEnum('status').notNull().default('active'),
  result: jsonb('result').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const conversationMessages = pgTable('conversation_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  action: jsonb('action').$type<Record<string, unknown>>(),
  noteOffer: jsonb('note_offer').$type<{ title: string; content: string; concept: string }>(),
  report: jsonb('report').$type<Record<string, unknown>>(),
  attachments: jsonb('attachments').$type<string[]>(),
  kind: varchar('kind', { length: 50 }).notNull().default('message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reasoningTranscripts = pgTable('reasoning_transcripts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  portalSessionId: uuid('portal_session_id').references(() => portalSessions.id, { onDelete: 'set null' }),
  concept: varchar('concept', { length: 500 }),
  subject: varchar('subject', { length: 255 }),
  exam: varchar('exam', { length: 100 }),
  questionIndex: integer('question_index'),
  questionText: text('question_text'),
  selectedAnswer: integer('selected_answer'),
  correctAnswer: integer('correct_answer'),
  isCorrect: boolean('is_correct'),
  transcript: text('transcript'),
  reasoningRequired: boolean('reasoning_required').default(false),
  reasoningCategory: varchar('reasoning_category', { length: 50 }),
  evidenceStrength: varchar('evidence_strength', { length: 50 }),
  assessmentMode: varchar('assessment_mode', { length: 50 }),
  responseTimeMs: integer('response_time_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// Type exports (for use in repositories)
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Concept = typeof concepts.$inferSelect;
export type NewConcept = typeof concepts.$inferInsert;
export type LearningRecord = typeof learningRecords.$inferSelect;
export type NewLearningRecord = typeof learningRecords.$inferInsert;
export type Mistake = typeof mistakes.$inferSelect;
export type NewMistake = typeof mistakes.$inferInsert;
export type Mission = typeof missions.$inferSelect;
export type NewMission = typeof missions.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type PortalSession = typeof portalSessions.$inferSelect;
export type NewPortalSession = typeof portalSessions.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;
export type ReasoningTranscript = typeof reasoningTranscripts.$inferSelect;
export type NewReasoningTranscript = typeof reasoningTranscripts.$inferInsert;
