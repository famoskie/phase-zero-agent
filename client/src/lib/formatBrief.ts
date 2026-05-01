/**
 * Normalizes brief section content for clean bullet-point rendering.
 *
 * The LLM sometimes returns items separated inline using:
 *   - Numbered: "First point. 2. Second point. 3. Third point."
 *   - Dash-separated: "First point. - Second point. - Third point."
 *   - Mixed: "First point. - Second point. 3. Third point."
 *
 * This function converts all such patterns into proper markdown bullet lists.
 */
export function formatBriefSection(text: string | null | undefined): string {
  if (!text) return "";

  // Already properly formatted with newline bullets — return as-is
  if (text.includes("\n- ") || text.startsWith("- ")) {
    return text;
  }

  // Detect inline numbered pattern: " 2. ", " 3. ", " 4. " etc.
  const hasInlineNumbers = /\s+\d+\.\s+/.test(text);
  // Detect inline dash separator pattern: " - " between sentences
  // Only match " - " that appears after a sentence (preceded by a letter/period/comma)
  const hasInlineDashes = /[a-zA-Z.,]\s+[-–]\s+[A-Z*]/.test(text);

  if (!hasInlineNumbers && !hasInlineDashes) return text;

  let normalized = text;

  // Step 1: Normalize inline numbered items
  if (hasInlineNumbers) {
    normalized = normalized
      .replace(/^\s*1\.\s+/, "") // remove leading "1. "
      .split(/\s+\d+\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n|||"); // temporary separator
  }

  // Step 2: Normalize inline dash separators within each segment
  // Split on " - " or " – " that appears to start a new item
  // (preceded by end of sentence: letter, period, comma)
  normalized = normalized
    .split("\n|||")
    .flatMap((segment) => {
      // Split on " - Bold" or " - Sentence" patterns (dash before capital or bold)
      const parts = segment.split(/\s+[-–]\s+(?=[A-Z*])/);
      return parts.map((p) => p.trim()).filter(Boolean);
    })
    .map((item) => `- ${item}`)
    .join("\n");

  return normalized;
}
