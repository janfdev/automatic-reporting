ALTER TABLE "daily_reports" ADD COLUMN "form_kendala" text;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "support_status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD COLUMN "kendala_status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "region" text;