import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Code2,
  Globe,
  Layers,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";

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

const CONF_DOT: Record<ConfidenceLevel, { dot: string; title: string }> = {
  explicit: { dot: "bg-emerald-500", title: "Stated on page" },
  inferred: { dot: "bg-amber-400", title: "AI-inferred" },
  unknown: { dot: "bg-muted-foreground/25", title: "Unknown" },
};

type MetricDef = {
  key: keyof Omit<CompanyMetrics, "metricsConfidence">;
  confKey: keyof MetricsConfidence;
  label: string;
  icon: React.ReactNode;
};

const METRIC_DEFS: MetricDef[] = [
  { key: "industry", confKey: "industry", label: "Industry", icon: <Layers className="w-3 h-3" /> },
  { key: "businessModel", confKey: "businessModel", label: "Model", icon: <Building2 className="w-3 h-3" /> },
  { key: "fundingStage", confKey: "fundingStage", label: "Funding", icon: <TrendingUp className="w-3 h-3" /> },
  { key: "employeeCount", confKey: "employeeCount", label: "Team", icon: <Users className="w-3 h-3" /> },
  { key: "foundedYear", confKey: "foundedYear", label: "Founded", icon: <Calendar className="w-3 h-3" /> },
  { key: "headquarters", confKey: "headquarters", label: "HQ", icon: <Globe className="w-3 h-3" /> },
  { key: "revenueModel", confKey: "revenueModel", label: "Revenue", icon: <CircleDollarSign className="w-3 h-3" /> },
  { key: "techStack", confKey: "techStack", label: "Stack", icon: <Code2 className="w-3 h-3" /> },
];

// ─── Single metric pill ───────────────────────────────────────────────────────
function MetricPill({
  icon,
  label,
  value,
  confidence,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  confidence: ConfidenceLevel;
}) {
  const isUnknown = !value || value.toLowerCase() === "unknown";
  const conf = CONF_DOT[confidence];

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-border shrink-0 min-w-0 max-w-[180px] sm:max-w-[220px]"
      title={`${label}: ${isUnknown ? "Unknown" : value} (${conf.title})`}
    >
      <span className={`shrink-0 ${isUnknown ? "text-muted-foreground/30" : "text-[oklch(0.38_0.12_264)]"}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">
          {label}
        </p>
        <p className={`text-xs font-medium leading-tight truncate ${isUnknown ? "text-muted-foreground/40 italic" : "text-foreground"}`}>
          {isUnknown ? "Unknown" : value}
        </p>
      </div>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} title={conf.title} />
    </div>
  );
}

// ─── Main MetricsBar ─────────────────────────────────────────────────────────
export function MetricsBar({
  metrics,
  pagesScraped,
  pagesSummary,
}: {
  metrics: CompanyMetrics;
  pagesScraped?: number | null;
  pagesSummary?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const conf = metrics.metricsConfidence ?? {};

  const pills = METRIC_DEFS.map((def) => ({
    ...def,
    value: (metrics[def.key] as string | null | undefined) ?? "",
    confidence: (conf[def.confKey] ?? "unknown") as ConfidenceLevel,
  }));

  const knownCount = pills.filter((p) => p.confidence === "explicit").length;
  const inferredCount = pills.filter((p) => p.confidence === "inferred").length;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollBy = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: direction === "right" ? 220 : -220, behavior: "smooth" });
  };

  return (
    <div className="border-b border-border bg-secondary/20">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
          Company Snapshot
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {pagesScraped && pagesScraped > 1 && (
            <span className="text-[10px] text-muted-foreground bg-white border border-border px-2 py-0.5 rounded-full whitespace-nowrap">
              Scraped {pagesScraped} pages: {pagesSummary}
            </span>
          )}
          <div className="flex items-center gap-2.5">
            {knownCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {knownCount} stated
              </span>
            )}
            {inferredCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {inferredCount} inferred
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable pill row with fade + arrow affordances */}
      <div className="relative pb-3">
        {/* Left fade + arrow */}
        <div
          className={`absolute left-0 top-0 bottom-3 w-12 z-10 pointer-events-none transition-opacity duration-200 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
          style={{ background: "linear-gradient(to right, oklch(0.96 0 0 / 0.95), transparent)" }}
        />
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}

        {/* Right fade + arrow */}
        <div
          className={`absolute right-0 top-0 bottom-3 w-16 z-10 pointer-events-none transition-opacity duration-200 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
          style={{ background: "linear-gradient(to left, oklch(0.96 0 0 / 0.95), transparent)" }}
        />
        {canScrollRight && (
          <button
            onClick={() => scrollBy("right")}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}

        {/* The scrollable row */}
        <div
          ref={scrollRef}
          className="overflow-x-auto px-4 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex gap-2" style={{ width: "max-content" }}>
            {pills.map((pill) => (
              <MetricPill
                key={pill.label}
                icon={pill.icon}
                label={pill.label}
                value={pill.value}
                confidence={pill.confidence}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
