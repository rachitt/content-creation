CREATE TABLE `attribution` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`utm` text NOT NULL,
	`post_id` text NOT NULL,
	`lead_id` text,
	`event_type` text NOT NULL,
	`ts` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_attribution_post_ts` ON `attribution` (`post_id`,`ts`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`idea_id` text,
	`template_id` text,
	`viral_source_ids` text,
	`channel` text NOT NULL,
	`body` text NOT NULL,
	`hook` text NOT NULL,
	`cta` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_at` integer,
	`buffer_id` text,
	`similarity_score` real,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_drafts_status_scheduled` ON `drafts` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE TABLE `handles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`handle` text NOT NULL,
	`vertical` text,
	`added_at` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`custom_threshold` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_handles_platform_handle` ON `handles` (`platform`,`handle`);--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`raw` text NOT NULL,
	`angle` text,
	`score` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ideas_status_score` ON `ideas` (`status`,`score`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`channel` text NOT NULL,
	`posted_at` integer NOT NULL,
	`url` text NOT NULL,
	`impressions` integer,
	`likes` integer,
	`comments` integer,
	`leads` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_posts_posted_at` ON `posts` (`posted_at`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`archetype` text NOT NULL,
	`structure` text NOT NULL,
	`hook_examples` text,
	`transition_examples` text,
	`sample_source_ids` text,
	`avg_engagement` real DEFAULT 0 NOT NULL,
	`last_used` integer,
	`use_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_templates_archetype` ON `templates` (`archetype`);--> statement-breakpoint
CREATE TABLE `viral_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`author` text NOT NULL,
	`author_url` text,
	`body` text NOT NULL,
	`url` text NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`comments` integer DEFAULT 0 NOT NULL,
	`reposts` integer DEFAULT 0 NOT NULL,
	`impressions` integer,
	`engagement_rate` real,
	`media_type` text,
	`fetched_at` integer NOT NULL,
	`posted_at` integer NOT NULL,
	`embedding` text,
	`tags` text,
	`cluster_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_viral_url` ON `viral_posts` (`url`);--> statement-breakpoint
CREATE INDEX `idx_viral_platform_likes` ON `viral_posts` (`platform`,`likes`);--> statement-breakpoint
CREATE INDEX `idx_viral_cluster` ON `viral_posts` (`cluster_id`);