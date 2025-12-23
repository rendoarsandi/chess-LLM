ALTER TABLE `game_reviews` ADD `progress_current` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_reviews` ADD `progress_total` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `move_analyses` ADD `player_color` text NOT NULL;