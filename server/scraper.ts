/**
 * Web scraper utility — fetches URLs and extracts meaningful text content.
 * Handles edge cases: non-existent domains, timeouts, paywalls, SPAs,
 * redirects, non-HTML responses, and bot-blocking (403/429).
 */

const TIMEOUT_MS = 12000;

// Known SPA/JS-heavy sites that return near-empty HTML
const SPA_INDICATORS = [
  "you need to enable javascript",
  "please enable javascript",
  "this site requires javascript",
  "loading...",
  "__next",
  "window.__nuxt",
  "window.__INITIAL_STATE__",
];

// Paywall / login wall indicators
const PAYWALL_INDICATORS = [
  "sign in to continue",
  "subscribe to read",
  "create a free account",
  "log in to access",
  "members only",
];

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type FetchResult =
  | { ok: true; text: string }
  | { ok: false; reason: "timeout" | "dns" | "blocked" | "empty" | "non-html" | "error"; detail?: string };

async function fetchPage(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    // Bot-blocked or auth-required
    if (response.status === 403) return { ok: false, reason: "blocked", detail: "Access denied (403)" };
    if (response.status === 429) return { ok: false, reason: "blocked", detail: "Rate limited (429)" };
    if (response.status === 401) return { ok: false, reason: "blocked", detail: "Authentication required (401)" };
    if (response.status === 404) return { ok: false, reason: "error", detail: "Page not found (404)" };
    if (response.status === 500 || response.status === 503) return { ok: false, reason: "error", detail: `Server error (${response.status})` };
    if (!response.ok) return { ok: false, reason: "error", detail: `HTTP ${response.status}` };

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return { ok: false, reason: "non-html", detail: `Unsupported content type: ${contentType.split(";")[0]}` };
    }

    const html = await response.text();
    const text = stripHtml(html);
    const lowerText = text.toLowerCase();

    // Detect SPA with no server-side content
    const isSpa = SPA_INDICATORS.some((s) => lowerText.includes(s));
    if (isSpa && text.length < 500) {
      return { ok: false, reason: "empty", detail: "Page requires JavaScript to render" };
    }

    // Detect paywall
    const isPaywalled = PAYWALL_INDICATORS.some((s) => lowerText.includes(s));
    if (isPaywalled && text.length < 800) {
      return { ok: false, reason: "blocked", detail: "Content behind a login or paywall" };
    }

    if (text.length < 50) {
      return { ok: false, reason: "empty", detail: "Page returned no meaningful content" };
    }

    return { ok: true, text };
  } catch (err: any) {
    clearTimeout(timer);
    const msg = err?.message ?? "";

    if (err?.name === "AbortError" || msg.includes("abort")) {
      return { ok: false, reason: "timeout", detail: `Request timed out after ${TIMEOUT_MS / 1000}s` };
    }
    // DNS / network errors
    if (
      msg.includes("ENOTFOUND") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ECONNRESET") ||
      msg.includes("getaddrinfo") ||
      msg.includes("network") ||
      msg.includes("fetch failed")
    ) {
      return { ok: false, reason: "dns", detail: "Domain not found or unreachable" };
    }
    return { ok: false, reason: "error", detail: msg || "Unknown error" };
  } finally {
    clearTimeout(timer);
  }
}

function buildUrlVariants(baseUrl: string): string[] {
  try {
    const parsed = new URL(baseUrl);
    const origin = parsed.origin;
    const paths = [parsed.pathname, "/about", "/about-us", "/pricing"];
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const p of paths) {
      const full = origin + p;
      if (!seen.has(full)) {
        seen.add(full);
        urls.push(full);
      }
    }
    return urls;
  } catch {
    return [baseUrl];
  }
}

export type ScrapeResult = {
  content: string;
  pagesScraped: number;
  pagesSummary: string;
};

export async function scrapeUrl(url: string): Promise<string> {
  const result = await scrapeMultiPage(url);
  return result.content;
}

export async function scrapeMultiPage(url: string): Promise<ScrapeResult> {
  const urls = buildUrlVariants(url);

  // Fetch all pages in parallel
  const results = await Promise.all(
    urls.map(async (u) => ({ url: u, result: await fetchPage(u) }))
  );

  const homepage = results[0];
  const successful = results.filter((r) => r.result.ok) as { url: string; result: { ok: true; text: string } }[];

  // If homepage specifically failed, give a descriptive error
  if (!homepage.result.ok) {
    const r = homepage.result;
    if (r.reason === "dns") {
      throw new Error(`The domain "${new URL(url).hostname}" doesn't exist or is unreachable. Please check the URL and try again.`);
    }
    if (r.reason === "timeout") {
      throw new Error(`The website took too long to respond (>${TIMEOUT_MS / 1000}s). It may be down or blocking automated access.`);
    }
    if (r.reason === "blocked") {
      throw new Error(`${r.detail}. This site may require login or is blocking automated access. Try a different URL.`);
    }
    if (r.reason === "empty") {
      throw new Error(`${r.detail}. This may be a JavaScript-only app. Try the /about page directly.`);
    }
    if (r.reason === "non-html") {
      throw new Error(`${r.detail}. Please enter a website URL (not a PDF, image, or API endpoint).`);
    }
    throw new Error(`Could not fetch the page: ${r.detail}. Please check the URL and try again.`);
  }

  if (successful.length === 0) {
    throw new Error(`Could not extract any content from ${url}. The site may be JavaScript-only or blocking automated access.`);
  }

  const perPageLimit = Math.floor(9000 / successful.length);
  const sections = successful.map((r) => {
    const label = r.url === urls[0] ? "Homepage" : new URL(r.url).pathname;
    return `[${label}]\n${r.result.text.slice(0, perPageLimit)}`;
  });

  const pagesSummary = successful
    .map((r) => (r.url === urls[0] ? "homepage" : new URL(r.url).pathname))
    .join(", ");

  return {
    content: sections.join("\n\n"),
    pagesScraped: successful.length,
    pagesSummary,
  };
}
