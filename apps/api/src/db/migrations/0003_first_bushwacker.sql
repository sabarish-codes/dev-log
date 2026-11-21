CREATE TABLE "logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"project_id" bigint,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"error_msg" text,
	"what_happened" text,
	"fix_takeaway" text NOT NULL,
	"link" text,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"timespent_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "logs_id_user_id_uq" UNIQUE("id","user_id"),
	CONSTRAINT "logs_title_not_blank" CHECK (btrim(title) <> ''),
	CONSTRAINT "logs_type_valid" CHECK (type IN ('bug', 'error', 'config', 'discovery')),
	CONSTRAINT "logs_fix_takeaway_not_blank" CHECK (btrim(fix_takeaway) <> ''),
	CONSTRAINT "logs_timespent_positive" CHECK (timespent_minutes > 0)
);
--> statement-breakpoint
CREATE TABLE "logs_tags" (
	"log_id" bigint NOT NULL,
	"tag_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	CONSTRAINT "logs_tags_log_id_tag_id_pk" PRIMARY KEY("log_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_id_user_id_uq" UNIQUE("id","user_id"),
	CONSTRAINT "projects_name_not_blank" CHECK (btrim(name) <> '')
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_id_user_id_uq" UNIQUE("id","user_id"),
	CONSTRAINT "tags_name_not_blank" CHECK (btrim(name) <> '')
);
--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_project_user_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."projects"("id","user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_tags" ADD CONSTRAINT "logs_tags_log_user_fk" FOREIGN KEY ("log_id","user_id") REFERENCES "public"."logs"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_tags" ADD CONSTRAINT "logs_tags_tag_user_fk" FOREIGN KEY ("tag_id","user_id") REFERENCES "public"."tags"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_user_name_uq" ON "projects" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_uq" ON "tags" USING btree ("user_id",lower("name"));