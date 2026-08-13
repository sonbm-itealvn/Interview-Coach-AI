CREATE TABLE `answer_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_turn_id` int NOT NULL,
	`user_id` int NOT NULL,
	`evidence_key` varchar(32) NOT NULL,
	`source_kind` enum('profile','star','document') NOT NULL,
	`label` varchar(320) NOT NULL,
	`reference` varchar(320) NOT NULL,
	`snippet` text NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`create_at` timestamp NOT NULL DEFAULT (now()),
	`create_by` int,
	`update_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`update_by` int,
	CONSTRAINT `answer_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `answer_sources_turn_idx` ON `answer_sources` (`practice_turn_id`);--> statement-breakpoint
CREATE INDEX `answer_sources_user_idx` ON `answer_sources` (`user_id`);