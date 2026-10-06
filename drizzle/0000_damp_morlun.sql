CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`event_date` text NOT NULL,
	`location` text NOT NULL,
	`quota` integer DEFAULT 30 NOT NULL,
	`fee` integer DEFAULT 80000 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_active_date` ON `events` (`active`,`event_date`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`social_media` text NOT NULL,
	`address` text NOT NULL,
	`payment_key` text NOT NULL,
	`payment_name` text NOT NULL,
	`payment_type` text NOT NULL,
	`payment_size` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_participants_event_created` ON `participants` (`event_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_participants_event_status` ON `participants` (`event_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_participants_event_phone_unique` ON `participants` (`event_id`,`phone`);--> statement-breakpoint
PRAGMA optimize;
