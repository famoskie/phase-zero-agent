import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, GitCompare, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";
import type { MetricsConfidence } from "@/components/MetricsBar";

// ─── Types ───────────────────────────────────────────────────────────────────
type Brief = {
  id: number;
  url: string;
  companyName: string;
  valueProposition: string | null;
  userPainPoints: string | null;
  aiOpportunities: string | null;
  recommendedEngagement: string | null;
  foundedYear?: string | null;
  employeeCount?: string | null;
  fundingStage?: string | null;
  industry?: string | null;
  headquarters?: string | null;
  businessModel?: string | null;
  techStack?: string | null;
  revenueModel?: string | null;
  metricsConfidence?: string | null;
  pagesScraped?: number | null;
  createdAt: Date;
};

// ─── Metric rows config ───────────────────────────────────────────────────────
const METRIC_ROWS: { key: keyof Brief; label: string }[] = [
  { key: "industry", label: "Industry" },
  { key: "businessModel", label: "Business Model" },
  { key: "fundingStage", label: "Funding Stage" },
  { key: "employeeCount", label: "Team Size" },
  { key: "foundedYear", label: "Founded" },
  { key: "headquarters", label: "HQ" },
  { key: "revenueModel", label: "Revenue Model" },
  { key: "techStack", label: "Tech Stack" },
];

const BRIEF_SECTIONS: { key: keyof Brief; label: string; icon: string; color: string }[] = [
  { key: "valueProposition", label: "Company & Core Value Proposition", icon: "🏢", color: "border-l-[3px] border-l-[oklch(0.38_0.12_264)]" },
  { key: "userPainPoints", label: "Inferred User Pain Points", icon: "⚡", color: "border-l-[3px] border-l-amber-400" },
  { key: "aiOpportunities", label: "AI Opportunity Areas", icon: "🤖", color: "border-l-[3px] border-l-emerald-500" },
  { key: "recommendedEngagement", label: "Recommended Fluxon Engagement Type", icon: "🎯", color: "border-l-[3px] border-l-rose-400" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getConfidence(brief: Brief, key: string): string {
  if (!brief.metricsConfidence) return "unknown";
  try {
    const conf: MetricsConfidence = typeof brief.metricsConfidence === "string"
      ? JSON.parse(brief.metricsConfidence)
      : brief.metricsConfidence;
    return (conf as any)[key] ?? "unknown";
  } catch { return "unknown"; }
}

const CONF_STYLES: Record<string, string> = {
  explicit: "text-emerald-600 font-medium",
  inferred: "text-amber-600",
  unknown: "text-muted-foreground/40 italic",
};

const CONF_DOTS: Record<string, string> = {
  explicit: "bg-emerald-500",
  inferred: "bg-amber-400",
  unknown: "bg-muted-foreground/20",
};

// ─── Column header ────────────────────────────────────────────────────────────
function CompanyHeader({ brief }: { brief: Brief }) {
  return (
    <div className="p-4 border-b border-border bg-secondary/30">
      <p className="font-display font-bold text-lg text-foreground leading-tight truncate">
        {brief.companyName}
      </p>
      <a
        href={brief.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:text-foreground truncate block mt-0.5 transition-colors"
      >
        {brief.url}
      </a>
      {brief.pagesScraped && brief.pagesScraped > 1 && (
        <span className="mt-1.5 inline-block text-[10px] text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full">
          {brief.pagesScraped} pages scraped
        </span>
      )}
    </div>
  );
}

// ─── Metric cell ──────────────────────────────────────────────────────────────
function MetricCell({ brief, metricKey, isDiff }: { brief: Brief; metricKey: string; isDiff: boolean }) {
  const value = (brief as any)[metricKey] as string | null | undefined;
  const conf = getConfidence(brief, metricKey);
  const isUnknown = !value || value.toLowerCase() === "unknown";

  return (
    <div className={`flex items-start gap-1.5 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors ${isDiff && !isUnknown ? "bg-amber-50 border border-amber-200" : ""}`}>
      <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${CONF_DOTS[conf] ?? CONF_DOTS.unknown}`} />
      <span className={`text-sm leading-snug ${isUnknown ? "text-muted-foreground/40 italic" : isDiff ? "text-amber-700 font-medium" : CONF_STYLES[conf] ?? ""}`}>
        {isUnknown ? "Unknown" : value}
      </span>
    </div>
  );
}

// ─── Main Compare View ────────────────────────────────────────────────────────
export default function CompareView({ ids }: { ids: number[] }) {
  const [, navigate] = useLocation();

  const queries = ids.map((id) => trpc.discovery.getById.useQuery({ id }));
  const briefs = queries.map((q) => q.data).filter(Boolean) as Brief[];
  const isLoading = queries.some((q) => q.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading briefs…</p>
        </div>
      </div>
    );
  }

  if (briefs.length < 2) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <GitCompare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Not enough briefs to compare</p>
          <p className="text-xs text-muted-foreground mb-4">Select at least 2 briefs from your history to compare them.</p>
          <Button size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[oklch(0.38_0.12_264)]" />
              <span className="font-display font-bold text-sm text-foreground">
                Comparing {briefs.length} Companies
              </span>
            </div>
          </div>
          <img
            src="/manus-storage/phase-zero-logo-cropped_13401adf.png"
            alt="Phase Zero"
            className="h-7 w-auto object-contain opacity-80"
          />
        </div>
      </header>

      <main className="flex-1 overflow-x-auto">
        <div className="container py-8">
          {/* Company header row */}
          <div
            className="grid gap-4 mb-6"
            style={{ gridTemplateColumns: `200px repeat(${briefs.length}, 1fr)` }}
          >
            <div className="flex items-end pb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Company</p>
            </div>
            {briefs.map((brief) => (
              <div key={brief.id} className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                <CompanyHeader brief={brief} />
              </div>
            ))}
          </div>

          {/* Metrics comparison table */}
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Company Snapshot</p>
              <div className="flex items-center gap-3 ml-auto text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Stated</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Inferred</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" /> Unknown</span>
              </div>
            </div>
          {METRIC_ROWS.map((row, i) => {
            // Detect if values differ across briefs (ignoring unknown)
            const values = briefs
              .map((b) => ((b as any)[row.key] as string | null | undefined) || "")
              .map((v) => v.toLowerCase().trim())
              .filter((v) => v && v !== "unknown");
            const isDiff = values.length > 1 && new Set(values).size > 1;

            return (
              <div
                key={row.key}
                className={`grid gap-4 px-4 py-3 ${isDiff ? "bg-amber-50/40" : i % 2 === 0 ? "bg-white" : "bg-secondary/10"}`}
                style={{ gridTemplateColumns: `200px repeat(${briefs.length}, 1fr)` }}
              >
                <div className="flex items-center gap-1.5 self-center">
                  <p className="text-xs font-semibold text-muted-foreground">{row.label}</p>
                  {isDiff && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                      Differs
                    </span>
                  )}
                </div>
                {briefs.map((brief) => (
                  <MetricCell key={brief.id} brief={brief} metricKey={row.key as string} isDiff={isDiff} />
                ))}
              </div>
            );
          })}
          </div>

          {/* Brief sections side by side */}
          {BRIEF_SECTIONS.map((section) => (
            <div key={section.key} className="bg-white border border-border rounded-xl overflow-hidden shadow-sm mb-4">
              <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
                <span className="text-base">{section.icon}</span>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {section.label}
                </p>
              </div>
              <div
                className="grid divide-x divide-border"
                style={{ gridTemplateColumns: `repeat(${briefs.length}, 1fr)` }}
              >
                {briefs.map((brief) => (
                  <div key={brief.id} className={`p-4 ${section.color}`}>
                    <p className="text-xs font-semibold text-[oklch(0.38_0.12_264)] mb-2 truncate">{brief.companyName}</p>
                    <div className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none">
                      <Streamdown>{(brief as any)[section.key] || "—"}</Streamdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
