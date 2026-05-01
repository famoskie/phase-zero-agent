import {
  Building2,
  Calendar,
  CircleDollarSign,
  Code2,
  Globe,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react";

export type ConfidenceLevel = "explicit" | "inferred" | "unknown";

export type MetricsConfidence = {
  foundedYear?: ConfidenceLevel;
  employeeCount?: ConfidenceLevel;
  fundingStage?: ConfidenceLevel;
  industry?: ConfidenceLevel;
  headquarters?: ConfidenceLevel;
  businessModel?: ConfidenceLevel;
  techStack?: ConfidenceLevel;
  revenueModel?: ConfidenceLevel;
};

export type CompanyMetrics = {
  foundedYear?: string | null;
  employeeCount?: string | null;
  fundingStage?: string | null;
  industry?: string | null;
  headquarters?: string | null;
  businessModel?: string | null;
  techStack?: string | null;
  revenueModel?: string | null;
  metricsConfidence?: MetricsConfidence | null;
};

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; color: string; dot: string }> = {
  explicit: {
    label: "Stated",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  inferred: {
    label: "Inferred",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
  },
  unknown: {
    label: "Unknown",
    color: "text-muted-foreground/60 bg-secondary border-border",
    dot: "bg-muted-foreground/30",
  },
};

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const cfg = CONFIDENCE_CONFIG[level];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.color}`}
      title={level === "explicit" ? "Directly stated on the page" : level === "inferred" ? "Reasonably deduced from context" : "Could not be determined"}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

type MetricItem = {
  icon: React.ReactNode;
  label: string;
  value: string;
  confidence: ConfidenceLevel;
};

function MetricChip({ icon, label, value, confidence }: MetricItem) {
  const isUnknown = !value || value.toLowerCase() === "unknown";
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white border border-border min-w-0 shadow-sm">
      <span className={`shrink-0 mt-0.5 ${isUnknown ? "text-muted-foreground/30" : "text-[oklch(0.38_0.12_264)]"}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">
            {label}
          </p>
          <ConfidenceBadge level={confidence} />
        </div>
        <p className={`text-sm font-medium leading-snug ${isUnknown ? "text-muted-foreground/40 italic" : "text-foreground"}`}>
          {isUnknown ? "Unknown" : value}
        </p>
      </div>
    </div>
  );
}

export function MetricsBar({
  metrics,
  pagesScraped,
  pagesSummary,
}: {
  metrics: CompanyMetrics;
  pagesScraped?: number | null;
  pagesSummary?: string | null;
}) {
  const conf = metrics.metricsConfidence ?? {};

  const items: MetricItem[] = [
    { icon: <Layers className="w-3.5 h-3.5" />, label: "Industry", value: metrics.industry || "", confidence: conf.industry ?? "unknown" },
    { icon: <Building2 className="w-3.5 h-3.5" />, label: "Business Model", value: metrics.businessModel || "", confidence: conf.businessModel ?? "unknown" },
    { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Funding Stage", value: metrics.fundingStage || "", confidence: conf.fundingStage ?? "unknown" },
    { icon: <Users className="w-3.5 h-3.5" />, label: "Team Size", value: metrics.employeeCount || "", confidence: conf.employeeCount ?? "unknown" },
    { icon: <Calendar className="w-3.5 h-3.5" />, label: "Founded", value: metrics.foundedYear || "", confidence: conf.foundedYear ?? "unknown" },
    { icon: <Globe className="w-3.5 h-3.5" />, label: "HQ", value: metrics.headquarters || "", confidence: conf.headquarters ?? "unknown" },
    { icon: <CircleDollarSign className="w-3.5 h-3.5" />, label: "Revenue Model", value: metrics.revenueModel || "", confidence: conf.revenueModel ?? "unknown" },
    { icon: <Code2 className="w-3.5 h-3.5" />, label: "Tech Stack", value: metrics.techStack || "", confidence: conf.techStack ?? "unknown" },
  ];

  const explicitCount = items.filter((i) => i.confidence === "explicit").length;
  const inferredCount = items.filter((i) => i.confidence === "inferred").length;

  return (
    <div className="px-6 py-4 border-b border-border bg-secondary/20">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Company Snapshot
        </p>
        <div className="flex items-center gap-2">
          {pagesScraped && pagesScraped > 1 && (
            <span className="text-[10px] text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full">
              Scraped {pagesScraped} pages: {pagesSummary}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            {explicitCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {explicitCount} stated
              </span>
            )}
            {inferredCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {inferredCount} inferred
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <MetricChip key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}
