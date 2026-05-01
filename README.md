# Phase Zero — Discovery Agent

> Paste any company URL. Get an instant, structured AI-powered discovery brief — the same analysis a senior PM does on day one of a new client engagement.

**Live app:** [phasezero.live](https://phasezero.live)

---

## What It Does

Phase Zero is a full-stack web application that takes a company's website URL and automatically generates a structured discovery brief using AI. It scrapes the homepage and supporting pages in parallel, sends the content to an LLM, and returns a clean, formatted brief with four sections:

| Section | What it covers |
|---|---|
| **Company & Core Value Proposition** | What the company does and who it serves |
| **Inferred User Pain Points** | Problems the product addresses or that users likely experience |
| **AI Opportunity Areas** | Concrete areas where AI/ML could improve the product |
| **Recommended Engagement Type** | Which consulting service line fits best (AI Expertise, MVP Dev, Product Strategy, etc.) |

Alongside the brief, the app extracts a **Company Snapshot** — 8 key metrics (industry, funding stage, team size, HQ, tech stack, etc.) each labeled as *Stated* (directly on the page) or *Inferred* (deduced by the AI).

---

## Features

- **Multi-page scraping** — fetches homepage, `/about`, and `/about-us` in parallel for richer context
- **Confidence indicators** — each metric chip shows whether the data was explicitly stated or AI-inferred
- **Brief history** — all generated briefs are saved per browser session (no login required)
- **Favorites & tagging** — star briefs and add custom tags; filter history by favorites or tag
- **Side-by-side comparison** — select up to 3 briefs and compare metrics and sections in a diff view
- **Regenerate** — re-scrape and re-analyze any existing brief with one click
- **Public share links** — generate a permanent read-only URL for any brief
- **PDF & Markdown export** — download a branded PDF or raw Markdown file
- **No login required** — session-based ownership via a persistent browser session ID
- **Responsive design** — works cleanly on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Node.js, Express, tRPC 11 |
| Database | MySQL (TiDB-compatible) via Drizzle ORM |
| AI | LLM via OpenAI-compatible API (configurable) |
| Auth | OAuth (optional, for cross-device history sync) |
| PDF Export | jsPDF (client-side, no server dependency) |

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- A MySQL-compatible database
- An OpenAI-compatible LLM API key

### Installation

```bash
git clone https://github.com/famoskie/phase-zero-agent.git
cd phase-zero-agent
pnpm install
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database
DATABASE_URL=mysql://user:password@host:3306/dbname

# LLM API (OpenAI-compatible)
BUILT_IN_FORGE_API_URL=https://api.openai.com
BUILT_IN_FORGE_API_KEY=sk-...

# Auth (optional — for cross-device history sync)
JWT_SECRET=your-secret-key
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://your-oauth-server
VITE_OAUTH_PORTAL_URL=https://your-login-portal

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

### Database Setup

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Development

```bash
pnpm dev
```

The app runs at `http://localhost:3000`.

### Tests

```bash
pnpm test
```

---

## Project Structure

```
client/          # React frontend
  src/
    components/  # Reusable UI components (MetricsBar, BriefLoader, etc.)
    lib/         # Utilities (pdfExport, formatBrief)
    pages/       # Page components (Home, CompareView, SharedBriefPage)

server/          # Express + tRPC backend
  routers/       # Feature routers (discovery, favorites)
  _core/         # Auth, LLM, session, storage helpers
  scraper.ts     # Multi-page web scraper with edge case handling
  db.ts          # Database query helpers

drizzle/         # Schema and migrations
shared/          # Shared constants and types
```

---

## Edge Case Handling

The scraper handles a wide range of failure modes with specific, actionable error messages:

| Scenario | Error message |
|---|---|
| Non-existent domain | "The domain X doesn't exist or is unreachable." |
| Timeout (>12s) | "The website took too long to respond." |
| Bot-blocked / 403 / 429 | "Access denied. This site may require login." |
| JavaScript-only SPA | "Page requires JavaScript to render." |
| Paywall / login wall | "Content behind a login or paywall." |
| Non-HTML URL (PDF, API) | "Please enter a website URL." |
| 404 Not Found | "Page not found (404)." |

---

## License

MIT
