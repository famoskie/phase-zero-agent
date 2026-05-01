/**
 * Client-side PDF export using jsPDF.
 * Generates a branded, structured brief PDF without any server round-trip.
 */

import jsPDF from "jspdf";

type Brief = {
  companyName: string;
  url: string;
  createdAt: Date | string;
  valueProposition?: string | null;
  userPainPoints?: string | null;
  aiOpportunities?: string | null;
  recommendedEngagement?: string | null;
  industry?: string | null;
  businessModel?: string | null;
  fundingStage?: string | null;
  employeeCount?: string | null;
  foundedYear?: string | null;
  headquarters?: string | null;
  revenueModel?: string | null;
  techStack?: string | null;
  pagesScraped?: number | null;
};

const BRAND_DARK = [15, 15, 15] as const;       // near-black
const BRAND_ACCENT = [60, 80, 180] as const;    // indigo
const BRAND_MUTED = [120, 120, 120] as const;
const BRAND_LIGHT = [240, 242, 255] as const;
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

function wrap(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "—", maxWidth);
}

function addPageIfNeeded(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN + 10;
  }
  return y;
}

export function exportBriefAsPdf(brief: Brief): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = MARGIN;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, PAGE_W, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("PHASE ZERO", MARGIN, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text("Discovery Agent  ·  Powered by AI", MARGIN + 32, 12);

  const dateStr = new Date(brief.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  doc.text(dateStr, PAGE_W - MARGIN, 12, { align: "right" });

  y = 28;

  // ── Company name ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BRAND_DARK);
  doc.text(brief.companyName, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_MUTED);
  doc.text(brief.url, MARGIN, y);
  if (brief.pagesScraped && brief.pagesScraped > 1) {
    doc.text(`  ·  Scraped ${brief.pagesScraped} pages`, MARGIN + doc.getTextWidth(brief.url), y);
  }
  y += 6;

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.setDrawColor(...BRAND_ACCENT);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // ── Metrics snapshot ────────────────────────────────────────────────────────
  const metrics: [string, string | null | undefined][] = [
    ["Industry", brief.industry],
    ["Business Model", brief.businessModel],
    ["Funding Stage", brief.fundingStage],
    ["Team Size", brief.employeeCount],
    ["Founded", brief.foundedYear],
    ["HQ", brief.headquarters],
    ["Revenue Model", brief.revenueModel],
    ["Tech Stack", brief.techStack],
  ].filter(([, v]) => v && v.toLowerCase() !== "unknown") as [string, string][];

  if (metrics.length > 0) {
    doc.setFillColor(...BRAND_LIGHT);
    const metricsHeight = 8 + Math.ceil(metrics.length / 2) * 7;
    doc.roundedRect(MARGIN, y, CONTENT_W, metricsHeight, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND_ACCENT);
    doc.text("COMPANY SNAPSHOT", MARGIN + 4, y + 5);
    y += 9;

    const colW = CONTENT_W / 2;
    metrics.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = MARGIN + 4 + col * colW;
      const cy = y + row * 7;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...BRAND_MUTED);
      doc.text(label.toUpperCase(), cx, cy);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...BRAND_DARK);
      doc.text(String(value).slice(0, 45), cx, cy + 3.5);
    });

    y += Math.ceil(metrics.length / 2) * 7 + 4;
  }

  y += 4;

  // ── Brief sections ───────────────────────────────────────────────────────────
  const sections: { label: string; content: string | null | undefined; color: [number, number, number] }[] = [
    { label: "Company & Core Value Proposition", content: brief.valueProposition, color: [60, 80, 180] },
    { label: "Inferred User Pain Points", content: brief.userPainPoints, color: [217, 119, 6] },
    { label: "AI Opportunity Areas", content: brief.aiOpportunities, color: [16, 130, 80] },
    { label: "Recommended Fluxon Engagement Type", content: brief.recommendedEngagement, color: [220, 50, 80] },
  ];

  for (const section of sections) {
    const lines = wrap(doc, section.content || "—", CONTENT_W - 8);
    const blockH = 10 + lines.length * 4.5;

    y = addPageIfNeeded(doc, y, blockH + 4);

    // Left accent bar
    doc.setFillColor(...section.color);
    doc.rect(MARGIN, y, 2, blockH, "F");

    // Section label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...section.color);
    doc.text(section.label.toUpperCase(), MARGIN + 6, y + 5);

    // Content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_DARK);
    doc.text(lines, MARGIN + 6, y + 10);

    y += blockH + 4;
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND_MUTED);
    doc.text(`Phase Zero Discovery Agent  ·  ${brief.companyName}`, MARGIN, PAGE_H - 8);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const filename = `phase-zero-${brief.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(filename);
}
