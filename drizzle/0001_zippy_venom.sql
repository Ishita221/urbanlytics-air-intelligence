CREATE TABLE `ingestion_leases` (
	`key` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingestion_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`location_key` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`duration_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ingestion_time` ON `ingestion_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`location_key` text NOT NULL,
	`name` text NOT NULL,
	`valid_at` integer NOT NULL,
	`retrieved_at` integer NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `snapshot_location_time` ON `snapshots` (`location_key`,`valid_at`);