/**
 * Normalizes brief section content for clean rendering.
 *
 * The LLM sometimes returns numbered items inline like:
 *   "First point. 2. Second point. 3. Third point."
 * or:
 *   "1. First point. 2. Second point."
 *
 * This function converts those patterns into proper markdown bullet lists
 * so Streamdown renders them as clean visual bullets.
 */
export function formatBriefSection(text: string | null | undefined): string {
  if (!text) return "";

  // Already has markdown bullets or newlines — return as-is
  if (text.includes("\n- ") || text.includes("\n•") || text.startsWith("- ")) {
    return text;
  }

  // Detect inline numbered pattern: "something. 2. something else. 3. ..."
  // Match patterns like: "2. ", "3. ", etc. appearing mid-sentence
  const inlineNumberPattern = /\s+\d+\.\s+/g;
  const hasInlineNumbers = inlineNumberPattern.test(text);

  if (!hasInlineNumbers) return text;

  // Split on inline number markers (e.g. " 2. ", " 3. ", " 4. ")
  // Also handle if text starts with "1. "
  const normalized = text
    // Normalize starting "1. " if present
    .replace(/^\s*1\.\s+/, "")
    // Split on " 2. ", " 3. ", etc.
    .split(/\s+\d+\.\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => `- ${item}`)
    .join("\n");

  return normalized;
}
