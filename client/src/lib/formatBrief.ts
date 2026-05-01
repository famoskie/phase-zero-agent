/**
 * Normalizes brief section content for clean bullet-point rendering.
 *
 * The LLM returns items separated inline in several ways:
 *   - Numbered:      "First point. 2. Second point. 3. Third point."
 *   - Dash-sep:      "First point. - Second point. - Third point."
 *   - Mixed:         "First point. - Second point. 3. Third point."
 *   - After period:  "...end of sentence. Next point starts here."
 *
 * Strategy: detect any inline separator pattern and split into clean "- item" lines.
 */
export function formatBriefSection(text: string | null | undefined): string {
  if (!text) return "";

  // Already properly formatted with newline bullets — return as-is
  if (text.includes("\n- ") || text.startsWith("- ")) {
    return text;
  }

  // Detect inline numbered pattern: " 2. ", " 3. ", " 4. " etc.
  const hasInlineNumbers = /\s+\d+\.\s+/.test(text);

  // Detect inline dash separator: ". - " or ". – " (period/comma then space-dash-space)
  // This is the most reliable signal — a sentence ending then a dash separator
  const hasInlineDashes = /[.!?]\s+[-–]\s+/.test(text);

  if (!hasInlineNumbers && !hasInlineDashes) return text;

  let parts: string[] = [];

  if (hasInlineNumbers) {
    // Split on numbered markers like " 2. ", " 3. " etc.
    parts = text
      .replace(/^\s*1\.\s+/, "") // strip leading "1. "
      .split(/\s+\d+\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    // Split on ". - " or ". – " patterns (sentence-ending period then dash separator)
    // Use a lookahead to keep the period with the preceding sentence
    parts = text
      .split(/(?<=[.!?])\s+[-–]\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // If splitting produced only 1 part, the pattern wasn't actually a list separator
  // Fall back to the original text
  if (parts.length <= 1) return text;

  return parts.map((item) => `- ${item}`).join("\n");
}
