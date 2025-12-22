CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`started_at` integer,
	`worker_id` text,
	`last_heartbeat` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `llm_configurations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text,
	`provider` text NOT NULL,
	`model_id` text NOT NULL,
	`api_key` text,
	`is_active` integer DEFAULT true NOT NULL,
	`is_hardcoded` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `move_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`review_id` text NOT NULL,
	`move_number` integer NOT NULL,
	`classification` text NOT NULL,
	`evaluation` text NOT NULL,
	`best_line` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `game_reviews`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_idx` ON `move_analyses` (`review_id`);--> statement-breakpoint
CREATE TABLE `rating_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`rating` integer NOT NULL,
	`game_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `player_rating_idx` ON `rating_history` (`player_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `tournament_participants` (
	`tournament_id` text NOT NULL,
	`player_id` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`buchholz` integer DEFAULT 0 NOT NULL,
	`joined_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tournament_participants_pk` ON `tournament_participants` (`tournament_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`start_time` integer NOT NULL,
	`time_control_settings` text,
	`current_round` integer DEFAULT 0 NOT NULL,
	`total_rounds` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`role` text,
	`banned` integer,
	`ban_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
ALTER TABLE `games` ADD `game_over_reason` text;--> statement-breakpoint
ALTER TABLE `games` ADD `pgn` text;--> statement-breakpoint
ALTER TABLE `games` ADD `tournament_id` text REFERENCES tournaments(id);--> statement-breakpoint
ALTER TABLE `games` ADD `round_number` integer;--> statement-breakpoint
ALTER TABLE `players` ADD `version` text;--> statement-breakpoint
ALTER TABLE `players` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `players` ADD `bio` text;