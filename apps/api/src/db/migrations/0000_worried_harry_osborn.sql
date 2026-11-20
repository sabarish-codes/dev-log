CREATE TABLE "users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_not_blank" CHECK (btrim("username") <> ''),
	CONSTRAINT "users_username_not_exceeding" CHECK (length("username") <= 128),
	CONSTRAINT "users_email_not_blank" CHECK (btrim("email") <> ''),
	CONSTRAINT "users_email_not_exceeding" CHECK (length("email") <= 256),
	CONSTRAINT "users_password_hash_not_blank" CHECK (btrim("password_hash") <> ''),
	CONSTRAINT "users_password_hash_not_exceeding" CHECK (length("password_hash") <= 256)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower" ON "users" USING btree (lower("email"));