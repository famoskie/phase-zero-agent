CREATE TABLE `briefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`url` text NOT NULL,
	`companyName` text,
	`valueProposition` text,
	`userPainPoints` text,
	`aiOpportunities` text,
	`recommendedEngagement` text,
	`rawContent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `briefs_id` PRIMARY KEY(`id`)
);
