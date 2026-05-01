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

## Company Metrics Feature
- [x] Add metrics columns to `briefs` table (foundedYear, employeeCount, fundingStage, industry, headquarters, businessModel, techStack, revenueModel)
- [x] Generate and apply DB migration for metrics columns
- [x] Update AI prompt in discovery router to extract metrics as structured JSON
- [x] Update DB insert/select helpers to include metrics fields
- [x] Build MetricsBar component with icon-labeled metric chips
- [x] Integrate MetricsBar into BriefCard (displayed between header and sections)
- [x] Show "N/A" gracefully for metrics that couldn't be inferred
- [x] Update vitest tests to cover metrics extraction

## Feature: Confidence Indicators
- [x] Add metricsConfidence JSON column to briefs table (stores per-metric explicit/inferred flags)
- [x] Generate and apply DB migration for metricsConfidence column
- [x] Update AI prompt to return a confidence object alongside each metric value
- [x] Update DB insert to persist metricsConfidence JSON
- [x] Update MetricsBar to accept and display confidence badges (green dot = explicit, amber dot = inferred)

## Feature: Multi-Page Scraping
- [x] Update scraper to accept multiple URLs and scrape /about and /pricing in parallel
- [x] Update discovery router to build URL list (homepage + /about + /pricing) and pass to scraper
- [x] Deduplicate and merge scraped content before sending to LLM
- [x] Add scraping source summary to brief header (e.g. "Scraped 3 pages")

## Feature: Comparison View
- [x] Add comparison mode toggle to history sidebar (select up to 3 briefs)
- [x] Build CompareView page/component with side-by-side metrics table and brief sections
- [x] Add route /compare to App.tsx
- [x] Add "Compare" button to brief cards in history that adds brief to comparison selection
- [x] Show diff highlights for metrics that differ between companies

## Feature: Regenerate
- [x] Add `discovery.regenerate` tRPC procedure (re-scrape URL, re-run LLM, update existing brief row)
- [x] Add "Regenerate" button to BriefCard header
- [x] Show loading state on regenerate (spinner replaces button)
- [x] Invalidate history list after regenerate

## Feature: PDF Export
- [x] Install html-pdf-node or use puppeteer-free approach (jsPDF + html2canvas on client)
- [x] Add `discovery.exportPdf` tRPC procedure that returns a base64 PDF
- [x] Build branded PDF template (company name, URL, date, 4 sections, metrics table)
- [x] Wire "Export as PDF" button in BriefCard to download the PDF

## Feature: Public Share Link
- [x] Add `shareToken` varchar column to briefs table (unique, random token)
- [x] Generate and apply DB migration for shareToken
- [x] Add `discovery.getByToken` public tRPC procedure
- [x] Add `discovery.createShareLink` protected procedure (generates token if not set)
- [x] Build read-only SharedBriefPage at /brief/:token
- [x] Add "Share" button to BriefCard that copies the share URL to clipboard
- [x] Add /brief/:token route to App.tsx

## Feature: Favorites & Tagging
- [x] Add `isFavorite` boolean and `tags` text (JSON array) columns to briefs table
- [x] Generate and apply DB migration
- [x] Add `discovery.toggleFavorite` tRPC procedure
- [x] Add `discovery.setTags` tRPC procedure
- [x] Add `discovery.list` filter support (favorites only, by tag)
- [x] Star button on each history item (filled star = favorited)
- [x] Tag chips display on each history item
- [x] Inline tag input to add/remove tags on a history item
- [x] Filter bar at top of history sidebar (All / Favorites / tag pills)
- [x] Favorites and tags also shown on the active BriefCard header
- [x] Vitest: toggleFavorite and setTags procedures

## UI Redesign: Better Web & Mobile Layout
- [x] MetricsBar: replace 4-col grid with horizontal scrollable pill-row (label + value inline, confidence dot)
- [x] MetricsBar: truncate long values with tooltip on hover
- [x] BriefCard header: move action buttons into a compact icon toolbar + overflow dropdown on mobile
- [x] BriefCard header: stack company name / URL / metadata cleanly on mobile
- [x] Ensure brief sections are full-width and readable on small screens
