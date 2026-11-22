CREATE INDEX "logs_user_id_idx" ON "logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "logs_project_id_idx" ON "logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "logs_tags_tag_id_idx" ON "logs_tags" USING btree ("tag_id");