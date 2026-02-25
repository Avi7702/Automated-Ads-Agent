CREATE TABLE "approval_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_queue_id" varchar NOT NULL,
	"event_type" varchar(30) NOT NULL,
	"user_id" varchar,
	"user_name" varchar(255),
	"user_role" varchar(50),
	"is_system_action" boolean DEFAULT false NOT NULL,
	"previous_status" varchar(25),
	"new_status" varchar(25) NOT NULL,
	"decision" varchar(20),
	"decision_reason" text,
	"decision_notes" text,
	"snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"ad_copy_id" varchar,
	"generation_id" varchar,
	"status" varchar(25) DEFAULT 'pending_review' NOT NULL,
	"priority" varchar(10) DEFAULT 'medium' NOT NULL,
	"ai_confidence_score" real,
	"ai_recommendation" varchar(20),
	"ai_reasoning" text,
	"safety_checks_passed" jsonb,
	"compliance_flags" text[],
	"scheduled_for" timestamp,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"auto_approve_enabled" boolean DEFAULT false NOT NULL,
	"min_confidence_for_auto_approve" integer DEFAULT 95 NOT NULL,
	"notify_on_pending" boolean DEFAULT true NOT NULL,
	"notify_on_auto_approve" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "business_intelligence" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"industry" text,
	"niche" text,
	"differentiator" text,
	"target_customer" jsonb,
	"content_themes" jsonb DEFAULT '[]'::jsonb,
	"posts_per_week" integer DEFAULT 5 NOT NULL,
	"category_targets" jsonb DEFAULT '{"product_showcase":30,"educational":25,"industry_insights":20,"company_updates":15,"engagement":10}'::jsonb,
	"preferred_platforms" jsonb DEFAULT '["linkedin"]'::jsonb,
	"posting_times" jsonb DEFAULT '{"monday":"09:00","tuesday":"10:00","wednesday":"09:00","thursday":"10:00","friday":"11:00"}'::jsonb,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_intelligence_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "experiment_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"variant" varchar(50) NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exp_assignment_unique" UNIQUE("experiment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "experiment_outcomes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"variant" varchar(50) NOT NULL,
	"metric" varchar(50) NOT NULL,
	"value" real DEFAULT 1 NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"variants" jsonb NOT NULL,
	"traffic_percent" integer DEFAULT 100 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduled_post_id" varchar NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"impressions" integer,
	"reach" integer,
	"likes" integer,
	"comments" integer,
	"shares" integer,
	"clicks" integer,
	"saves" integer,
	"engagement_rate" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_priorities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"revenue_tier" text DEFAULT 'core' NOT NULL,
	"revenue_weight" integer DEFAULT 5 NOT NULL,
	"competitive_angle" text,
	"key_selling_points" jsonb DEFAULT '[]'::jsonb,
	"monthly_target" integer DEFAULT 2 NOT NULL,
	"last_posted_date" timestamp,
	"total_posts" integer DEFAULT 0 NOT NULL,
	"seasonal_relevance" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_priorities_user_product" UNIQUE("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"connection_id" varchar NOT NULL,
	"caption" text NOT NULL,
	"hashtags" text[],
	"image_url" text,
	"image_public_id" text,
	"scheduled_for" timestamp NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"status" varchar(25) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"platform_post_id" varchar(255),
	"platform_post_url" text,
	"error_message" text,
	"failure_reason" varchar(50),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp,
	"generation_id" varchar,
	"template_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_connections" (
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
CREATE TABLE "style_references" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"cloudinary_url" text NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"name" text NOT NULL,
	"category" varchar(20) NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"style_description" text,
	"extracted_elements" jsonb,
	"confidence" integer DEFAULT 0 NOT NULL,
	"image_fingerprint" text NOT NULL,
	"analyzed_at" timestamp,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_datasets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"base_model" varchar(100) DEFAULT 'gemini-2.5-flash',
	"status" varchar(30) DEFAULT 'draft',
	"example_count" integer DEFAULT 0,
	"tuned_model_name" text,
	"tuned_model_endpoint" text,
	"training_config" jsonb,
	"training_metrics" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_examples" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset_id" varchar NOT NULL,
	"input_text" text NOT NULL,
	"output_text" text NOT NULL,
	"category" varchar(50),
	"quality" real,
	"source_generation_id" varchar,
	"is_validated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"week_start" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"posts" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "media_type" varchar(10) DEFAULT 'image';--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "video_duration_sec" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(20) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "approval_audit_log" ADD CONSTRAINT "approval_audit_log_approval_queue_id_approval_queue_id_fk" FOREIGN KEY ("approval_queue_id") REFERENCES "public"."approval_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_log" ADD CONSTRAINT "approval_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_ad_copy_id_ad_copy_id_fk" FOREIGN KEY ("ad_copy_id") REFERENCES "public"."ad_copy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_settings" ADD CONSTRAINT "approval_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_outcomes" ADD CONSTRAINT "experiment_outcomes_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_outcomes" ADD CONSTRAINT "experiment_outcomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_scheduled_post_id_scheduled_posts_id_fk" FOREIGN KEY ("scheduled_post_id") REFERENCES "public"."scheduled_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_connection_id_social_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_references" ADD CONSTRAINT "style_references_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_datasets" ADD CONSTRAINT "training_datasets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_examples" ADD CONSTRAINT "training_examples_dataset_id_training_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."training_datasets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_queue_id" ON "approval_audit_log" USING btree ("approval_queue_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_event_type" ON "approval_audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "approval_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_approval_queue_user_status" ON "approval_queue" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_approval_queue_priority" ON "approval_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_approval_queue_scheduled" ON "approval_queue" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_approval_settings_user_id" ON "approval_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "business_intelligence_user_id_idx" ON "business_intelligence" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "business_intelligence_onboarding_idx" ON "business_intelligence" USING btree ("onboarding_complete");--> statement-breakpoint
CREATE INDEX "exp_assignments_experiment_idx" ON "experiment_assignments" USING btree ("experiment_id");--> statement-breakpoint
CREATE INDEX "exp_outcomes_experiment_idx" ON "experiment_outcomes" USING btree ("experiment_id");--> statement-breakpoint
CREATE INDEX "exp_outcomes_metric_idx" ON "experiment_outcomes" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "experiments_status_idx" ON "experiments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_post_analytics_post_fetched" ON "post_analytics" USING btree ("scheduled_post_id","fetched_at");--> statement-breakpoint
CREATE INDEX "product_priorities_user_id_idx" ON "product_priorities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_priorities_revenue_tier_idx" ON "product_priorities" USING btree ("revenue_tier");--> statement-breakpoint
CREATE INDEX "push_subs_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subs_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_sched_posts_user_scheduled" ON "scheduled_posts" USING btree ("user_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_sched_posts_conn_status" ON "scheduled_posts" USING btree ("connection_id","status");--> statement-breakpoint
CREATE INDEX "idx_sched_posts_status_time" ON "scheduled_posts" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_social_conn_user_platform" ON "social_connections" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "idx_social_conn_user_id" ON "social_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "style_refs_user_idx" ON "style_references" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "style_refs_category_idx" ON "style_references" USING btree ("category");--> statement-breakpoint
CREATE INDEX "style_refs_created_at_idx" ON "style_references" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "training_datasets_user_id_idx" ON "training_datasets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_datasets_status_idx" ON "training_datasets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "training_examples_dataset_id_idx" ON "training_examples" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "training_examples_category_idx" ON "training_examples" USING btree ("category");--> statement-breakpoint
CREATE INDEX "weekly_plans_user_week_idx" ON "weekly_plans" USING btree ("user_id","week_start");--> statement-breakpoint
CREATE INDEX "weekly_plans_status_idx" ON "weekly_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_copy_user_id_idx" ON "ad_copy" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ad_copy_generation_id_idx" ON "ad_copy" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "ad_copy_platform_idx" ON "ad_copy" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "ad_copy_created_at_idx" ON "ad_copy" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ad_copy_framework_idx" ON "ad_copy" USING btree ("framework");--> statement-breakpoint
CREATE INDEX "ad_scene_templates_category_idx" ON "ad_scene_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ad_scene_templates_created_by_idx" ON "ad_scene_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "ad_scene_templates_is_global_idx" ON "ad_scene_templates" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "ad_scene_templates_created_at_idx" ON "ad_scene_templates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_key_audit_log_user_id_idx" ON "api_key_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_audit_log_service_idx" ON "api_key_audit_log" USING btree ("service");--> statement-breakpoint
CREATE INDEX "api_key_audit_log_action_idx" ON "api_key_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "api_key_audit_log_created_at_idx" ON "api_key_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brand_images_user_id_idx" ON "brand_images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brand_images_category_idx" ON "brand_images" USING btree ("category");--> statement-breakpoint
CREATE INDEX "brand_images_scenario_id_idx" ON "brand_images" USING btree ("scenario_id");--> statement-breakpoint
CREATE INDEX "brand_images_created_at_idx" ON "brand_images" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brand_profiles_user_id_idx" ON "brand_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gemini_quota_alerts_brand_id_idx" ON "gemini_quota_alerts" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "gemini_quota_alerts_alert_type_idx" ON "gemini_quota_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "gemini_quota_alerts_is_enabled_idx" ON "gemini_quota_alerts" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "gemini_quota_metrics_brand_id_idx" ON "gemini_quota_metrics" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "gemini_quota_metrics_window_type_idx" ON "gemini_quota_metrics" USING btree ("window_type");--> statement-breakpoint
CREATE INDEX "gemini_quota_metrics_window_start_idx" ON "gemini_quota_metrics" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "gemini_rate_limit_events_brand_id_idx" ON "gemini_rate_limit_events" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "gemini_rate_limit_events_created_at_idx" ON "gemini_rate_limit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "gemini_rate_limit_events_limit_type_idx" ON "gemini_rate_limit_events" USING btree ("limit_type");--> statement-breakpoint
CREATE INDEX "generation_usage_generation_id_idx" ON "generation_usage" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "generation_usage_brand_id_idx" ON "generation_usage" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "generation_usage_operation_idx" ON "generation_usage" USING btree ("operation");--> statement-breakpoint
CREATE INDEX "generation_usage_created_at_idx" ON "generation_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "generations_user_id_idx" ON "generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generations_created_at_idx" ON "generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "generations_parent_id_idx" ON "generations" USING btree ("parent_generation_id");--> statement-breakpoint
CREATE INDEX "generations_status_idx" ON "generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "google_quota_snapshots_project_id_idx" ON "google_quota_snapshots" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "google_quota_snapshots_synced_at_idx" ON "google_quota_snapshots" USING btree ("synced_at");--> statement-breakpoint
CREATE INDEX "google_quota_snapshots_sync_status_idx" ON "google_quota_snapshots" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "google_quota_sync_history_status_idx" ON "google_quota_sync_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "google_quota_sync_history_started_at_idx" ON "google_quota_sync_history" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "google_quota_sync_history_trigger_type_idx" ON "google_quota_sync_history" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "installation_scenarios_user_id_idx" ON "installation_scenarios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "installation_scenarios_scenario_type_idx" ON "installation_scenarios" USING btree ("scenario_type");--> statement-breakpoint
CREATE INDEX "installation_scenarios_primary_product_id_idx" ON "installation_scenarios" USING btree ("primary_product_id");--> statement-breakpoint
CREATE INDEX "installation_scenarios_is_active_idx" ON "installation_scenarios" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "performing_ad_templates_user_id_idx" ON "performing_ad_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "performing_ad_templates_category_idx" ON "performing_ad_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "performing_ad_templates_is_active_idx" ON "performing_ad_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "performing_ad_templates_is_featured_idx" ON "performing_ad_templates" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "performing_ad_templates_created_at_idx" ON "performing_ad_templates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_analyses_product_id_idx" ON "product_analyses" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_analyses_category_idx" ON "product_analyses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "product_relationships_user_id_idx" ON "product_relationships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_relationships_source_product_id_idx" ON "product_relationships" USING btree ("source_product_id");--> statement-breakpoint
CREATE INDEX "product_relationships_target_product_id_idx" ON "product_relationships" USING btree ("target_product_id");--> statement-breakpoint
CREATE INDEX "product_relationships_relationship_type_idx" ON "product_relationships" USING btree ("relationship_type");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_enrichment_status_idx" ON "products" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX "prompt_templates_category_idx" ON "prompt_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "prompt_templates_created_at_idx" ON "prompt_templates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_api_keys_user_id_idx" ON "user_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_api_keys_service_idx" ON "user_api_keys" USING btree ("service");--> statement-breakpoint
CREATE INDEX "user_api_keys_is_valid_idx" ON "user_api_keys" USING btree ("is_valid");