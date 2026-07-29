CREATE TYPE "public"."care_channel" AS ENUM('call', 'zalo', 'sms', 'email', 'visit', 'other');--> statement-breakpoint
CREATE TYPE "public"."care_direction" AS ENUM('outbound', 'inbound');--> statement-breakpoint
CREATE TYPE "public"."care_disposition" AS ENUM('connected', 'no_answer', 'callback', 'agreed', 'refused', 'resolved', 'other');--> statement-breakpoint
CREATE TYPE "public"."care_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."care_task_status" AS ENUM('todo', 'contacting', 'scheduled', 'in_progress', 'done', 'lost');--> statement-breakpoint
CREATE TYPE "public"."care_task_type" AS ENUM('re_service_due', 'csat', 'warranty', 'complaint', 'followup', 'upsell', 'new_lead', 'quote', 'other');--> statement-breakpoint
CREATE TABLE "care_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"care_task_id" uuid,
	"channel" "care_channel" DEFAULT 'call' NOT NULL,
	"direction" "care_direction" DEFAULT 'outbound' NOT NULL,
	"disposition" "care_disposition" DEFAULT 'connected' NOT NULL,
	"summary" text NOT NULL,
	"next_follow_up_at" date,
	"actor_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "care_task_type" DEFAULT 'followup' NOT NULL,
	"status" "care_task_status" DEFAULT 'todo' NOT NULL,
	"priority" "care_priority" DEFAULT 'normal' NOT NULL,
	"assignee_id" uuid,
	"due_date" date,
	"related_order_id" uuid,
	"source_line_id" uuid,
	"reminder_stage" integer DEFAULT 0 NOT NULL,
	"next_follow_up_at" date,
	"sla_due_at" timestamp with time zone,
	"position" double precision DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "care_interactions" ADD CONSTRAINT "care_interactions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_interactions" ADD CONSTRAINT "care_interactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_interactions" ADD CONSTRAINT "care_interactions_care_task_id_care_tasks_id_fk" FOREIGN KEY ("care_task_id") REFERENCES "public"."care_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_interactions" ADD CONSTRAINT "care_interactions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_tasks" ADD CONSTRAINT "care_tasks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_tasks" ADD CONSTRAINT "care_tasks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_tasks" ADD CONSTRAINT "care_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_tasks" ADD CONSTRAINT "care_tasks_related_order_id_service_orders_id_fk" FOREIGN KEY ("related_order_id") REFERENCES "public"."service_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_tasks" ADD CONSTRAINT "care_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_interactions_customer_idx" ON "care_interactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "care_interactions_task_idx" ON "care_interactions" USING btree ("care_task_id");--> statement-breakpoint
CREATE INDEX "care_tasks_branch_status_idx" ON "care_tasks" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "care_tasks_assignee_idx" ON "care_tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "care_tasks_customer_idx" ON "care_tasks" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "care_tasks_related_order_idx" ON "care_tasks" USING btree ("related_order_id");