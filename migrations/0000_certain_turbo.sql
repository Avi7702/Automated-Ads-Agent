CREATE TABLE "ad_copy" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"headline" text NOT NULL,
	"hook" text NOT NULL,
	"body_text" text NOT NULL,
	"cta" text NOT NULL,
	"caption" text NOT NULL,
	"hashtags" text[] NOT NULL,
	"platform" varchar(50) NOT NULL,
	"tone" varchar(50) NOT NULL,
	"framework" varchar(50),
	"campaign_objective" varchar(50),
	"product_name" text NOT NULL,
	"product_description" text NOT NULL,
	"product_benefits" text[],
	"unique_value_prop" text,
	"industry" varchar(100) NOT NULL,
	"target_audience" jsonb,
	"brand_voice" jsonb,
	"social_proof" jsonb,
	"quality_score" jsonb,
	"character_counts" jsonb,
	"variation_number" integer DEFAULT 1,
	"parent_copy_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_scene_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"preview_image_url" text NOT NULL,
	"preview_public_id" text NOT NULL,
	"reference_images" jsonb,
	"category" varchar(50) NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"platform_hints" text[],
	"aspect_ratio_hints" text[],
	"prompt_blueprint" text NOT NULL,
	"placement_hints" jsonb,
	"lighting_style" varchar(50),
	"intent" varchar(50),
	"environment" varchar(50),
	"mood" varchar(50),
	"best_for_product_types" text[],
	"is_global" boolean DEFAULT true NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"service" varchar(50) NOT NULL,
	"action" varchar(20) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"success" boolean NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"cloudinary_url" text NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"description" text,
	"product_ids" text[],
	"scenario_id" varchar,
	"suggested_use" text[],
	"aspect_ratio" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"brand_name" text,
	"industry" varchar(100),
	"brand_values" text[],
	"target_audience" jsonb,
	"preferred_styles" text[],
	"color_preferences" text[],
	"voice" jsonb,
	"kb_tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "gemini_quota_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"alert_type" varchar(30) NOT NULL,
	"threshold_value" integer NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp,
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gemini_quota_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_type" varchar(20) NOT NULL,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL,
	"brand_id" varchar NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"rate_limit_count" integer DEFAULT 0 NOT NULL,
	"input_tokens_total" integer DEFAULT 0 NOT NULL,
	"output_tokens_total" integer DEFAULT 0 NOT NULL,
	"estimated_cost_micros" integer DEFAULT 0 NOT NULL,
	"generate_count" integer DEFAULT 0 NOT NULL,
	"edit_count" integer DEFAULT 0 NOT NULL,
	"analyze_count" integer DEFAULT 0 NOT NULL,
	"model_breakdown" jsonb,
	"latency_p50" integer,
	"latency_p90" integer,
	"latency_p99" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gemini_quota_metrics_window_type_window_start_brand_id_unique" UNIQUE("window_type","window_start","brand_id")
);
--> statement-breakpoint
CREATE TABLE "gemini_rate_limit_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" varchar NOT NULL,
	"operation" varchar(20) NOT NULL,
	"model" varchar(100) NOT NULL,
	"limit_type" varchar(20) NOT NULL,
	"retry_after_seconds" integer,
	"endpoint" varchar(100),
	"request_metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" varchar NOT NULL,
	"brand_id" varchar NOT NULL,
	"model" text NOT NULL,
	"operation" varchar(20) NOT NULL,
	"resolution" varchar(10) NOT NULL,
	"input_images_count" integer NOT NULL,
	"prompt_chars" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"estimated_cost_micros" integer NOT NULL,
	"estimation_source" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "generation_usage_generation_id_unique" UNIQUE("generation_id")
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"prompt" text NOT NULL,
	"original_image_paths" text[] NOT NULL,
	"generated_image_path" text NOT NULL,
	"image_path" text,
	"resolution" varchar(10) DEFAULT '2K',
	"model" text,
	"aspect_ratio" varchar(10) DEFAULT '1:1',
	"status" varchar(20) DEFAULT 'completed',
	"conversation_history" jsonb,
	"parent_generation_id" varchar,
	"edit_prompt" text,
	"edit_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_quota_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"synced_at" timestamp NOT NULL,
	"next_sync_at" timestamp NOT NULL,
	"sync_status" varchar(20) NOT NULL,
	"error_message" text,
	"project_id" varchar(100) NOT NULL,
	"service" varchar(200) NOT NULL,
	"quotas" jsonb NOT NULL,
	"brand_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_quota_sync_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"metrics_requested" integer DEFAULT 0 NOT NULL,
	"metrics_fetched" integer DEFAULT 0 NOT NULL,
	"trigger_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installation_scenarios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"scenario_type" varchar(50) NOT NULL,
	"primary_product_id" varchar,
	"secondary_product_ids" text[],
	"reference_images" jsonb,
	"installation_steps" text[],
	"required_accessories" text[],
	"room_types" text[],
	"style_tags" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performing_ad_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"source_url" text,
	"source_platform" varchar(50),
	"advertiser_name" text,
	"engagement_tier" varchar(20),
	"estimated_engagement_rate" integer,
	"running_days" integer,
	"estimated_budget" varchar(20),
	"platform_metrics" jsonb,
	"layouts" jsonb,
	"color_palette" jsonb,
	"typography" jsonb,
	"background_type" varchar(20),
	"content_blocks" jsonb,
	"visual_patterns" text[],
	"mood" varchar(50),
	"style" varchar(50),
	"template_format" varchar(20),
	"source_file_url" text,
	"preview_image_url" text,
	"preview_public_id" text,
	"editable_variables" text[],
	"target_platforms" text[],
	"target_aspect_ratios" text[],
	"best_for_industries" text[],
	"best_for_objectives" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_analyses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"image_fingerprint" text NOT NULL,
	"category" varchar(100),
	"subcategory" varchar(100),
	"materials" text[],
	"colors" text[],
	"style" varchar(50),
	"usage_context" text,
	"target_demographic" text,
	"detected_text" text,
	"confidence" integer DEFAULT 80,
	"model_version" varchar(50),
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_analyses_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "product_relationships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"source_product_id" varchar NOT NULL,
	"target_product_id" varchar NOT NULL,
	"relationship_type" varchar(50) NOT NULL,
	"description" text,
	"is_required" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_relationships_source_product_id_target_product_id_relationship_type_unique" UNIQUE("source_product_id","target_product_id","relationship_type")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cloudinary_url" text NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"category" varchar(100),
	"description" text,
	"features" jsonb,
	"benefits" text[],
	"specifications" jsonb,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"sku" varchar(100),
	"enrichment_status" varchar(20) DEFAULT 'pending',
	"enrichment_draft" jsonb,
	"enrichment_verified_at" timestamp,
	"enrichment_source" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"category" varchar(100),
	"tags" text[] DEFAULT ARRAY[]::text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"service" varchar(50) NOT NULL,
	"encrypted_key" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"key_preview" varchar(20),
	"is_valid" boolean DEFAULT true NOT NULL,
	"last_validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_api_keys_user_id_service_unique" UNIQUE("user_id","service")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"password_hash" text,
	"failed_attempts" integer DEFAULT 0,
	"locked_until" timestamp,
	"brand_voice" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ad_copy" ADD CONSTRAINT "ad_copy_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_copy" ADD CONSTRAINT "ad_copy_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_scene_templates" ADD CONSTRAINT "ad_scene_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_audit_log" ADD CONSTRAINT "api_key_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_images" ADD CONSTRAINT "brand_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_images" ADD CONSTRAINT "brand_images_scenario_id_installation_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."installation_scenarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_usage" ADD CONSTRAINT "generation_usage_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installation_scenarios" ADD CONSTRAINT "installation_scenarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installation_scenarios" ADD CONSTRAINT "installation_scenarios_primary_product_id_products_id_fk" FOREIGN KEY ("primary_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performing_ad_templates" ADD CONSTRAINT "performing_ad_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relationships" ADD CONSTRAINT "product_relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relationships" ADD CONSTRAINT "product_relationships_source_product_id_products_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relationships" ADD CONSTRAINT "product_relationships_target_product_id_products_id_fk" FOREIGN KEY ("target_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;