-- Manual migration for social_connections and scheduled_posts tables (Phase 8.1)
-- Generated: 2026-01-26

CREATE TABLE IF NOT EXISTS "social_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"platform" varchar(20) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_iv" text NOT NULL,
	"token_auth_tag" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"last_refreshed_at" timestamp,
	"platform_user_id" varchar(255),
	"platform_username" varchar(255),
	"profile_picture_url" text,
	"account_type" varchar(20),
	"scopes" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"last_error_at" timestamp,
	"last_error_message" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"connection_id" varchar NOT NULL,
	"caption" text NOT NULL,
	"media_url" text,
	"scheduled_for" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"posted_at" timestamp,
	"platform_post_id" varchar(255),
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"impressions" integer,
	"engagement" integer,
	"clicks" integer,
	"shares" integer,
	"comments" integer,
	"likes" integer,
	"saves" integer
);
--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_connection_id_social_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_post_id_scheduled_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."scheduled_posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_conn_user_platform" ON "social_connections" USING btree ("user_id","platform");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_social_conn_user_id" ON "social_connections" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduled_posts_user_status" ON "scheduled_posts" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduled_posts_scheduled_for" ON "scheduled_posts" USING btree ("scheduled_for");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_post_analytics_post" ON "post_analytics" USING btree ("post_id");
