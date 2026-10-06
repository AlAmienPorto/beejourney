ALTER TABLE `events` ADD `bank_name` text DEFAULT 'BCA' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `bank_account_number` text DEFAULT '2380842940' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `bank_account_name` text DEFAULT 'Izza Riskuna Sa''adah' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `confirmation_whatsapp` text DEFAULT '' NOT NULL;--> statement-breakpoint
PRAGMA optimize;
