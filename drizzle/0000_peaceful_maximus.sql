CREATE TABLE `operatorActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planKey` varchar(96),
	`actionType` varchar(48) NOT NULL,
	`detail` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operatorActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routePlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planKey` varchar(96) NOT NULL,
	`originId` varchar(64) NOT NULL,
	`destinationId` varchar(64) NOT NULL,
	`distanceMeters` int NOT NULL,
	`durationSeconds` int NOT NULL,
	`routeSummary` varchar(255) NOT NULL,
	`sourceMode` varchar(32) NOT NULL,
	`status` enum('proposed','approved','simulated') NOT NULL DEFAULT 'proposed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routePlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `routePlans_planKey_unique` UNIQUE(`planKey`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
