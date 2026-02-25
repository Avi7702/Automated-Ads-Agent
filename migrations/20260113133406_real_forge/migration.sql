CREATE TABLE "ad_analysis_uploads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"cloudinary_url" text NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"original_filename" text,
	"file_size_bytes" integer,
	"mime_type" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"privacy_scan_result" jsonb,
	"extracted_pattern_id" varchar,
	"processing_started_at" timestamp,
	"processing_completed_at" timestamp,
	"processing_duration_ms" integer,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learned_ad_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"platform" varchar(50) NOT NULL,
	"industry" varchar(100),
	"layout_pattern" jsonb,
	"color_psychology" jsonb,
	"hook_patterns" jsonb,
	"visual_elements" jsonb,
	"engagement_tier" varchar(20),
	"confidence_score" real DEFAULT 0.8,
	"source_hash" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learned_ad_patterns_user_id_source_hash_unique" UNIQUE("user_id","source_hash")
);
--> statement-breakpoint
CREATE TABLE "pattern_application_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"pattern_id" varchar NOT NULL,
	"generated_ad_id" varchar,
	"product_id" varchar,
	"target_platform" varchar(50),
	"prompt_used" text,
	"user_rating" integer,
	"was_used" boolean DEFAULT false NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pattern_application_history_pattern_id_generated_ad_id_unique" UNIQUE("pattern_id","generated_ad_id")
);
--> statement-breakpoint
ALTER TABLE "ad_analysis_uploads" ADD CONSTRAINT "ad_analysis_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_analysis_uploads" ADD CONSTRAINT "ad_analysis_uploads_extracted_pattern_id_learned_ad_patterns_id_fk" FOREIGN KEY ("extracted_pattern_id") REFERENCES "public"."learned_ad_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learned_ad_patterns" ADD CONSTRAINT "learned_ad_patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_application_history" ADD CONSTRAINT "pattern_application_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_application_history" ADD CONSTRAINT "pattern_application_history_pattern_id_learned_ad_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."learned_ad_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_application_history" ADD CONSTRAINT "pattern_application_history_generated_ad_id_generations_id_fk" FOREIGN KEY ("generated_ad_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_application_history" ADD CONSTRAINT "pattern_application_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_uploads_status" ON "ad_analysis_uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_uploads_expires" ON "ad_analysis_uploads" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_uploads_user_id" ON "ad_analysis_uploads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_learned_patterns_user_id" ON "learned_ad_patterns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_learned_patterns_category" ON "learned_ad_patterns" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_learned_patterns_platform" ON "learned_ad_patterns" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_history_pattern_id" ON "pattern_application_history" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "idx_history_user_id" ON "pattern_application_history" USING btree ("user_id");