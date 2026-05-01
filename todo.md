# Phase Zero Discovery Agent — TODO

## Backend
- [x] Add `briefs` table to drizzle schema (id, userId, url, companyName, brief JSON, createdAt)
- [x] Generate and apply DB migration
- [x] Add scraper utility (fetch + extract text from URL)
- [x] Add `discovery.generate` tRPC procedure (scrape + LLM brief generation)
- [x] Add `discovery.list` tRPC procedure (fetch user's brief history)
- [x] Add `discovery.delete` tRPC procedure (delete a brief)

## Frontend
- [x] Design system: Fluxon-inspired theme (white bg, bold typography, minimal palette) in index.css
- [x] Landing/home page with hero, URL input form, and CTA
- [x] Loading state with animated progress indicator
- [x] Structured brief output with 4 labeled sections (Company & Core Value Proposition, Inferred User Pain Points, AI Opportunity Areas, Recommended Fluxon Engagement Type)
- [x] Brief history sidebar/panel for revisiting past briefs
- [x] Copy-to-clipboard functionality
- [x] Export brief as markdown/text file
- [x] Responsive design (mobile + desktop)
- [x] Auth-aware UI (login prompt for history, anonymous generation allowed)

## Testing
- [x] Vitest: discovery.generate procedure (mocked scraper + LLM)
- [x] Vitest: discovery.list procedure

## Polish
- [x] Empty states (no history, no brief yet)
- [x] Error handling (invalid URL, scrape failure, LLM error)
- [x] Toast notifications for copy/export success
