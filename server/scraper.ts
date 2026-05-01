/**
 * Web scraper utility — fetches URLs and extracts meaningful text content.
 * Supports multi-page scraping (homepage + /about + /pricing) in parallel.
 */

const TIMEOUT_MS = 12000;

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

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PhaseZeroBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;
    const html = await response.text();
    return stripHtml(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildUrlVariants(baseUrl: string): string[] {
  try {
    const parsed = new URL(baseUrl);
    const origin = parsed.origin;
    const paths = [parsed.pathname, "/about", "/about-us", "/pricing"];
    // Deduplicate
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
  pagesSummary: string; // e.g. "homepage, /about, /pricing"
};

export async function scrapeUrl(url: string): Promise<string> {
  const result = await scrapeMultiPage(url);
  return result.content;
}

export async function scrapeMultiPage(url: string): Promise<ScrapeResult> {
  const urls = buildUrlVariants(url);

  // Fetch all pages in parallel
  const results = await Promise.all(
    urls.map(async (u) => ({ url: u, text: await fetchPage(u) }))
  );

  const successful = results.filter((r) => r.text && r.text.length > 50);

  if (successful.length === 0) {
    throw new Error(`Could not fetch any content from ${url}`);
  }

  // Merge content with page labels, truncate each page to keep total under ~10k chars
  const perPageLimit = Math.floor(9000 / successful.length);
  const sections = successful.map((r) => {
    const label = r.url === urls[0] ? "Homepage" : new URL(r.url).pathname;
    return `[${label}]\n${r.text!.slice(0, perPageLimit)}`;
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
