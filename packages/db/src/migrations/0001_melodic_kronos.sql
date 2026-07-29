CREATE TYPE "public"."asset_category" AS ENUM('extinguisher', 'alarm_panel', 'detector', 'hydrant', 'sprinkler', 'emergency_light', 'hose', 'pump', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('active', 'inactive', 'faulty', 'retired', 'pending');--> statement-breakpoint
CREATE TYPE "public"."site_type" AS ENUM('building', 'factory', 'restaurant', 'school', 'office', 'other');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"category" "asset_category" DEFAULT 'extinguisher' NOT NULL,
	"name" text NOT NULL,
	"serial_no" text,
	"qr_code" text NOT NULL,
	"manufacturer" text,
	"capacity" text,
	"manufacture_date" date,
	"installed_at" date,
	"last_inspected_at" date,
	"next_due_date" date,
	"status" "asset_status" DEFAULT 'active' NOT NULL,
	"location_note" text,
	"photo_url" text,
	"notes" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"type" "site_type" DEFAULT 'building' NOT NULL,
	"address" text,
	"ward" text,
	"district" text,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"notes" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_site_idx" ON "assets" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "assets_branch_idx" ON "assets" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "assets_next_due_idx" ON "assets" USING btree ("next_due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_qr_branch_idx" ON "assets" USING btree ("branch_id","qr_code");--> statement-breakpoint
CREATE INDEX "sites_branch_idx" ON "sites" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "sites_customer_idx" ON "sites" USING btree ("customer_id");