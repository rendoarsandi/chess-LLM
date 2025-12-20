ALTER TABLE `moves` ADD `opening` text;--> statement-breakpoint
ALTER TABLE `moves` ADD `candidates` text;--> statement-breakpoint
ALTER TABLE `moves` ADD `reasoning` text;--> statement-breakpoint
ALTER TABLE `players` ADD `rating` integer DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `wins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `losses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `draws` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `peak_rating` integer DEFAULT 1200 NOT NULL;