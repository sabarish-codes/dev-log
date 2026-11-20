ALTER TABLE "users" DROP CONSTRAINT "users_username_not_blank";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_username_not_exceeding";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_not_blank";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_not_exceeding";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_password_hash_not_blank";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_password_hash_not_exceeding";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_not_blank" CHECK (btrim(username) <> '');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_not_exceeding" CHECK (length(username) <= 128);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_not_blank" CHECK (btrim(email) <> '');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_not_exceeding" CHECK (length(email) <= 256);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_password_hash_not_blank" CHECK (btrim(password_hash) <> '');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_password_hash_not_exceeding" CHECK (length(password_hash) <= 256);