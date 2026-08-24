CREATE TYPE "public"."learning_status" AS ENUM('not_started', 'learning', 'practiced', 'mastered', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'alpha', 'system');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."mistake_pattern" AS ENUM('sign_error', 'formula_confusion', 'misreading', 'concept_confusion', 'forgotten_prerequisite', 'calculation_error', 'careless', 'time_pressure', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."portal_session_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."portal_type" AS ENUM('lesson', 'quiz', 'exam', 'mistake_clinic', 'review', 'challenge', 'practice', 'diagnostic', 'mastery_check', 'image', 'document', 'voice');--> statement-breakpoint
CREATE TYPE "public"."question_difficulty" AS ENUM('beginner', 'intermediate', 'advanced', 'exam', 'challenge');--> statement-breakpoint
CREATE TYPE "public"."question_provenance" AS ENUM('verified_official', 'third_party_sourced', 'authored_practice', 'ai_generated', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept" varchar(500) NOT NULL,
	"subject" varchar(255),
	"exam" varchar(100),
	"prerequisites" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"action" jsonb,
	"note_offer" jsonb,
	"report" jsonb,
	"attachments" jsonb,
	"kind" varchar(50) DEFAULT 'message' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"concept" varchar(500) NOT NULL,
	"exam" varchar(100),
	"subject" varchar(255),
	"status" "learning_status" DEFAULT 'not_started' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"last_score" real DEFAULT 0 NOT NULL,
	"mastery_score" real DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_reviewed" timestamp with time zone,
	"next_review" timestamp with time zone,
	"preferred_style" varchar(255),
	"weak_patterns" jsonb DEFAULT '[]'::jsonb,
	"seen_questions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal" text NOT NULL,
	"exam" varchar(100),
	"deadline" varchar(100),
	"total_minutes" integer,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"current_step" integer DEFAULT 0 NOT NULL,
	"status" "mission_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mistakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"concept" varchar(500) NOT NULL,
	"question_text" text NOT NULL,
	"student_answer" varchar(500),
	"correct_answer" varchar(500),
	"pattern" "mistake_pattern" DEFAULT 'unknown' NOT NULL,
	"portal_type" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"concept" varchar(500),
	"subject" varchar(255),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"portal_type" "portal_type" NOT NULL,
	"concept" varchar(500),
	"config" jsonb,
	"status" "portal_session_status" DEFAULT 'active' NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept" varchar(500) NOT NULL,
	"exam" varchar(100),
	"subject" varchar(255),
	"topic" varchar(255),
	"question_text" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text,
	"difficulty" "question_difficulty" DEFAULT 'intermediate' NOT NULL,
	"provenance" "question_provenance" DEFAULT 'authored_practice' NOT NULL,
	"source_label" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reasoning_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"portal_session_id" uuid,
	"concept" varchar(500),
	"subject" varchar(255),
	"exam" varchar(100),
	"question_index" integer,
	"question_text" text,
	"selected_answer" integer,
	"correct_answer" integer,
	"is_correct" boolean,
	"transcript" text,
	"reasoning_required" boolean DEFAULT false,
	"reasoning_category" varchar(50),
	"evidence_strength" varchar(50),
	"assessment_mode" varchar(50),
	"response_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"first_name" varchar(255),
	"middle_name" varchar(255),
	"last_name" varchar(255),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"reset_token" varchar(255),
	"reset_token_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_records" ADD CONSTRAINT "learning_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reasoning_transcripts" ADD CONSTRAINT "reasoning_transcripts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reasoning_transcripts" ADD CONSTRAINT "reasoning_transcripts_portal_session_id_portal_sessions_id_fk" FOREIGN KEY ("portal_session_id") REFERENCES "public"."portal_sessions"("id") ON DELETE set null ON UPDATE no action;