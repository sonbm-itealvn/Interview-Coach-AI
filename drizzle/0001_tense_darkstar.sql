CREATE TABLE `candidate_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`full_name` varchar(160),
	`professional_summary` text,
	`skills` text,
	`target_role` varchar(240),
	`target_company` varchar(240),
	`coaching_style` enum('concise','balanced','detailed') NOT NULL DEFAULT 'balanced',
	`create_at` timestamp NOT NULL DEFAULT (now()),
	`create_by` int,
	`update_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`update_by` int,
	CONSTRAINT `candidate_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_profiles_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `candidate_profile_user_idx` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int NOT NULL,
	`user_id` int NOT NULL,
	`chunk_index` int NOT NULL,
	`section_label` varchar(280),
	`page_number` int,
	`content` text NOT NULL,
	`normalized_terms` text,
	`create_at` timestamp NOT NULL DEFAULT (now()),
	`create_by` int,
	`update_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`update_by` int,
	CONSTRAINT `document_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interview_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('cv','article','job_description','other') NOT NULL,
	`title` varchar(280) NOT NULL,
	`file_name` varchar(360) NOT NULL,
	`mime_type` varchar(160) NOT NULL,
	`storage_key` varchar(620) NOT NULL,
	`storage_url` varchar(720) NOT NULL,
	`extracted_text` text,
	`extraction_status` enum('ready','needs_review','failed') NOT NULL DEFAULT 'ready',
	`chunk_count` int NOT NULL DEFAULT 0,
	`create_at` timestamp NOT NULL DEFAULT (now()),
	`create_by` int,
	`update_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`update_by` int,
	CONSTRAINT `interview_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`target_role` varchar(240),
	`status` enum('active','completed') NOT NULL DEFAULT 'active',
	`create_at` timestamp NOT NULL DEFAULT (now()),
	`create_by` int,
	`update_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`update_by` int,
	CONSTRAINT `practice_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_turns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`user_id` int NOT NULL,
	`question` text NOT NULL,
	`transcript` text NOT NULL,
	`question_type` enum('introduction','experience','technical','article','behavioral') NOT NULL,
	`outline` text,
	`sample_answer` text,
	`coaching_notes` text,
	`sources_json` text,
	`create_at` timestamp NOT NULL DEFAULT (now()),
	`create_by` int,
	`update_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`update_by` int,
	CONSTRAINT `practice_turns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `star_stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`skill_tags` text,
	`situation` text NOT NULL,
	`task` text NOT NULL,
	`action` text NOT NULL,
	`result` text NOT NULL,
	`metrics` text,
	`evidence` text,
	`create_at` timestamp NOT NULL DEFAULT (now()),
	`create_by` int,
	`update_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`update_by` int,
	CONSTRAINT `star_stories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `document_chunks_user_idx` ON `document_chunks` (`user_id`);--> statement-breakpoint
CREATE INDEX `document_chunks_document_idx` ON `document_chunks` (`document_id`);--> statement-breakpoint
CREATE INDEX `interview_documents_user_idx` ON `interview_documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `practice_sessions_user_idx` ON `practice_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `practice_turns_session_idx` ON `practice_turns` (`session_id`);--> statement-breakpoint
CREATE INDEX `practice_turns_user_idx` ON `practice_turns` (`user_id`);--> statement-breakpoint
CREATE INDEX `star_stories_user_idx` ON `star_stories` (`user_id`);
