ALTER TABLE `games` ADD `variant` text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `start_pos_id` integer;--> statement-breakpoint
ALTER TABLE `players` ADD `rating960` integer DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `peak_rating960` integer DEFAULT 1200 NOT NULL;