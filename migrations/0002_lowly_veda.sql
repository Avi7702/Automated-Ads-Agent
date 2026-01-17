CREATE TABLE "content_planner_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"category" varchar(50) NOT NULL,
	"sub_type" varchar(100) NOT NULL,
	"platform" varchar(50),
	"notes" text,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_planner_posts" ADD CONSTRAINT "content_planner_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_content_planner_user_posted" ON "content_planner_posts" USING btree ("user_id","posted_at");--> statement-breakpoint
CREATE INDEX "idx_content_planner_user_category" ON "content_planner_posts" USING btree ("user_id","category");