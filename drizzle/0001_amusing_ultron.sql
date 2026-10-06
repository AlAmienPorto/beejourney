ALTER TABLE `events` ADD `slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
PRAGMA optimize;
