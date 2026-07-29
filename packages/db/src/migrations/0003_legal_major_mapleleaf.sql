CREATE TYPE "public"."fault_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."fault_status" AS ENUM('open', 'in_repair', 'resolved');--> statement-breakpoint
CREATE TABLE "faults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"inspection_id" uuid,
	"severity" "fault_severity" DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"status" "fault_status" DEFAULT 'open' NOT NULL,
	"assignee_id" uuid,
	"found_at" date DEFAULT now() NOT NULL,
	"resolved_at" date,
	"resolution_note" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faults" ADD CONSTRAINT "faults_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "faults_branch_idx" ON "faults" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "faults_asset_idx" ON "faults" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "faults_status_idx" ON "faults" USING btree ("status");