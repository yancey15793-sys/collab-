CREATE TYPE "public"."article_status" AS ENUM('INGESTED', 'NORMALIZED', 'ENRICHED', 'CLUSTERED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('PERSON', 'COMPANY', 'ORGANIZATION', 'LOCATION', 'PRODUCT', 'SPORT', 'EVENT');--> statement-breakpoint
CREATE TYPE "public"."source_sync_status" AS ENUM('SUCCESS', 'PARTIAL', 'FAILURE');--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('DISCOVERED', 'ACTIVE', 'DEVELOPING', 'STABLE', 'DORMANT', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."summary_type" AS ENUM('HEADLINE', 'BRIEF', 'OVERVIEW', 'DIGEST', 'DETAILED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"type" "summary_type" NOT NULL,
	"content" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_entities" (
	"article_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"confidence" real NOT NULL,
	CONSTRAINT "article_entities_article_id_entity_id_pk" PRIMARY KEY("article_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"canonical_url" text,
	"author" text,
	"description" text,
	"content" text,
	"image_url" text,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"language" text,
	"hash" text NOT NULL,
	"word_count" integer,
	"reading_time" integer,
	"status" "article_status" DEFAULT 'INGESTED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "entity_type" NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"timestamp" timestamp with time zone NOT NULL,
	"importance" real DEFAULT 0 NOT NULL,
	"source_article_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "source_sync_status",
	"articles_fetched" integer DEFAULT 0 NOT NULL,
	"articles_new" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"feed_url" text NOT NULL,
	"website_url" text,
	"language" text,
	"country" text,
	"category" text,
	"favicon" text,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"etag" text,
	"last_modified" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"status" "story_status" DEFAULT 'DISCOVERED' NOT NULL,
	"importance_score" real DEFAULT 0 NOT NULL,
	"trend_score" real DEFAULT 0 NOT NULL,
	"novelty_score" real DEFAULT 0 NOT NULL,
	"velocity_score" real DEFAULT 0 NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"article_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_articles" (
	"story_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"relevance_score" real NOT NULL,
	CONSTRAINT "story_articles_story_id_article_id_pk" PRIMARY KEY("story_id","article_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_entities" (
	"story_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"confidence" real NOT NULL,
	CONSTRAINT "story_entities_story_id_entity_id_pk" PRIMARY KEY("story_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_topics" (
	"story_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"confidence" real NOT NULL,
	CONSTRAINT "story_topics_story_id_topic_id_pk" PRIMARY KEY("story_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"parent_topic_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"score" real NOT NULL,
	"velocity" real NOT NULL,
	"novelty" real NOT NULL,
	"source_diversity" real NOT NULL,
	"article_velocity" real NOT NULL,
	"user_affinity" real DEFAULT 0 NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_folder_sources" (
	"folder_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "user_folder_sources_folder_id_source_id_pk" PRIMARY KEY("folder_id","source_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"user_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"weight" real DEFAULT 0 NOT NULL,
	CONSTRAINT "user_preferences_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_saved_articles" (
	"user_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_saved_articles_user_id_article_id_pk" PRIMARY KEY("user_id","article_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_saved_stories" (
	"user_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_saved_stories_user_id_story_id_pk" PRIMARY KEY("user_id","story_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sources" (
	"user_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "user_sources_user_id_source_id_pk" PRIMARY KEY("user_id","source_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"timezone" text DEFAULT 'Europe/Paris' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_entities" ADD CONSTRAINT "article_entities_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_entities" ADD CONSTRAINT "article_entities_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_source_article_id_articles_id_fk" FOREIGN KEY ("source_article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "source_sync_logs" ADD CONSTRAINT "source_sync_logs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_articles" ADD CONSTRAINT "story_articles_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_articles" ADD CONSTRAINT "story_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_entities" ADD CONSTRAINT "story_entities_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_entities" ADD CONSTRAINT "story_entities_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_topics" ADD CONSTRAINT "story_topics_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_topics" ADD CONSTRAINT "story_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trends" ADD CONSTRAINT "trends_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_folder_sources" ADD CONSTRAINT "user_folder_sources_folder_id_user_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."user_folders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_folder_sources" ADD CONSTRAINT "user_folder_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_folders" ADD CONSTRAINT "user_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_saved_articles" ADD CONSTRAINT "user_saved_articles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_saved_articles" ADD CONSTRAINT "user_saved_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_saved_stories" ADD CONSTRAINT "user_saved_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_saved_stories" ADD CONSTRAINT "user_saved_stories_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sources" ADD CONSTRAINT "user_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sources" ADD CONSTRAINT "user_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_summaries_cache_key" ON "ai_summaries" USING btree ("story_id","type","prompt_version");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "articles_hash_unique" ON "articles" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "articles_url_unique" ON "articles" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "entities_normalized_name_type_unique" ON "entities" USING btree ("normalized_name","type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sources_feed_url_unique" ON "sources" USING btree ("feed_url");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stories_slug_unique" ON "stories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "topics_slug_unique" ON "topics" USING btree ("slug");