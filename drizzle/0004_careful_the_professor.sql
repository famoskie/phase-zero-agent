ALTER TABLE `briefs` ADD `shareToken` varchar(64);--> statement-breakpoint
ALTER TABLE `briefs` ADD CONSTRAINT `briefs_shareToken_unique` UNIQUE(`shareToken`);