import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { getLoginUrl } from "@/const";
import {
  ArrowRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  GitCompare,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { exportBriefAsPdf } from "@/lib/pdfExport";
import { Streamdown } from "streamdown";
import { MetricsBar, type CompanyMetrics, type MetricsConfidence } from "@/components/MetricsBar";

// ─── Types ───────────────────────────────────────────────────────────────────
type Brief = {
  id: number;
  url: string;
  companyName: string;
  valueProposition: string;
  userPainPoints: string;
  aiOpportunities: string;
  recommendedEngagement: string;
  createdAt: Date;
  // Metrics
  foundedYear?: string | null;
  employeeCount?: string | null;
  fundingStage?: string | null;
  industry?: string | null;
  headquarters?: string | null;
  businessModel?: string | null;
  techStack?: string | null;
  revenueModel?: string | null;
  metricsConfidence?: string | Record<string, string> | null;
  pagesScraped?: number | null;
  pagesSummary?: string | null;
};

// ─── Section config ───────────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: "valueProposition" as const,
    label: "Company & Core Value Proposition",
    icon: "🏢",
    color: "border-l-[3px] border-l-[oklch(0.38_0.12_264)]",
  },
  {
    key: "userPainPoints" as const,
    label: "Inferred User Pain Points",
    icon: "⚡",
    color: "border-l-[3px] border-l-amber-400",
  },
  {
    key: "aiOpportunities" as const,
    label: "AI Opportunity Areas",
    icon: "🤖",
    color: "border-l-[3px] border-l-emerald-500",
  },
  {
    key: "recommendedEngagement" as const,
    label: "Recommended Fluxon Engagement Type",
    icon: "🎯",
    color: "border-l-[3px] border-l-rose-400",
  },
];

// ─── Brief Card ───────────────────────────────────────────────────────────────
function BriefCard({ brief, onRegenerate, isOwner }: { brief: Brief; onRegenerate?: (updated: Brief) => void; isOwner?: boolean }) {
  // Parse metricsConfidence from JSON string (DB) or use directly (fresh generate)
  let parsedConfidence: MetricsConfidence | undefined;
  if (brief.metricsConfidence) {
    try {
      parsedConfidence = typeof brief.metricsConfidence === "string"
        ? JSON.parse(brief.metricsConfidence)
        : brief.metricsConfidence as MetricsConfidence;
    } catch { /* ignore */ }
  }

  const metrics: CompanyMetrics = {
    foundedYear: brief.foundedYear,
    employeeCount: brief.employeeCount,
    fundingStage: brief.fundingStage,
    industry: brief.industry,
    headquarters: brief.headquarters,
    businessModel: brief.businessModel,
    techStack: brief.techStack,
    revenueModel: brief.revenueModel,
    metricsConfidence: parsedConfidence,
  };

  const metricsText = [
    brief.industry && `Industry: ${brief.industry}`,
    brief.businessModel && `Business Model: ${brief.businessModel}`,
    brief.fundingStage && `Funding: ${brief.fundingStage}`,
    brief.employeeCount && `Team Size: ${brief.employeeCount}`,
    brief.foundedYear && `Founded: ${brief.foundedYear}`,
    brief.headquarters && `HQ: ${brief.headquarters}`,
    brief.revenueModel && `Revenue Model: ${brief.revenueModel}`,
    brief.techStack && `Tech Stack: ${brief.techStack}`,
  ].filter(Boolean).join(" · ");

  const handleCopy = () => {
    const text = `# Phase Zero Discovery Brief\n**Company:** ${brief.companyName}\n**URL:** ${brief.url}\n**Generated:** ${new Date(brief.createdAt).toLocaleDateString()}\n${metricsText ? `\n**Snapshot:** ${metricsText}` : ""}\n\n---\n\n## Company & Core Value Proposition\n${brief.valueProposition}\n\n## Inferred User Pain Points\n${brief.userPainPoints}\n\n## AI Opportunity Areas\n${brief.aiOpportunities}\n\n## Recommended Fluxon Engagement Type\n${brief.recommendedEngagement}`;
    navigator.clipboard.writeText(text);
    toast.success("Brief copied to clipboard");
  };

  const handleExportMd = () => {
    const text = `# Phase Zero Discovery Brief\n**Company:** ${brief.companyName}\n**URL:** ${brief.url}\n**Generated:** ${new Date(brief.createdAt).toLocaleDateString()}\n${metricsText ? `\n**Snapshot:** ${metricsText}` : ""}\n\n---\n\n## Company & Core Value Proposition\n${brief.valueProposition}\n\n## Inferred User Pain Points\n${brief.userPainPoints}\n\n## AI Opportunity Areas\n${brief.aiOpportunities}\n\n## Recommended Fluxon Engagement Type\n${brief.recommendedEngagement}`;
    const blob = new Blob([text], { type: "text/markdown" });
    const mdUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = mdUrl;
    a.download = `phase-zero-${brief.companyName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(mdUrl);
    toast.success("Brief exported as Markdown");
  };

  const handleExportPdf = () => {
    exportBriefAsPdf({
      companyName: brief.companyName,
      url: brief.url,
      createdAt: brief.createdAt,
      valueProposition: brief.valueProposition,
      userPainPoints: brief.userPainPoints,
      aiOpportunities: brief.aiOpportunities,
      recommendedEngagement: brief.recommendedEngagement,
      industry: brief.industry,
      businessModel: brief.businessModel,
      fundingStage: brief.fundingStage,
      employeeCount: brief.employeeCount,
      foundedYear: brief.foundedYear,
      headquarters: brief.headquarters,
      revenueModel: brief.revenueModel,
      techStack: brief.techStack,
      pagesScraped: brief.pagesScraped,
    });
    toast.success("PDF downloaded");
  };

  const utils = trpc.useUtils();
  const regenerateMutation = trpc.discovery.regenerate.useMutation({
    onSuccess: (data) => {
      onRegenerate?.(data as Brief);
      utils.discovery.list.invalidate();
      toast.success("Brief regenerated successfully");
    },
    onError: (err) => toast.error(err.message || "Regeneration failed"),
  });

  const shareMutation = trpc.discovery.createShareLink.useMutation({
    onSuccess: ({ token }) => {
      const shareUrl = `${window.location.origin}/brief/${token}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard");
    },
    onError: (err) => toast.error(err.message || "Could not create share link"),
  });

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground leading-tight">
              {brief.companyName}
            </h2>
            <a
              href={brief.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {brief.url}
            </a>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {isOwner && brief.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => regenerateMutation.mutate({ id: brief.id! })}
                disabled={regenerateMutation.isPending}
                className="gap-1.5 text-xs"
              >
                {regenerateMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />}
                {regenerateMutation.isPending ? "Regenerating…" : "Regenerate"}
              </Button>
            )}
            {isOwner && brief.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareMutation.mutate({ id: brief.id! })}
                disabled={shareMutation.isPending}
                className="gap-1.5 text-xs"
              >
                {shareMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Link2 className="w-3.5 h-3.5" />}
                Share
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportMd} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              MD
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[oklch(0.94_0.04_264)] text-[oklch(0.38_0.12_264)]">
            <Sparkles className="w-3 h-3" />
            Phase Zero Brief
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(brief.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Metrics Bar */}
      <MetricsBar metrics={metrics} pagesScraped={brief.pagesScraped} pagesSummary={brief.pagesSummary} />

      {/* Sections */}
      <div className="p-6 grid gap-4">
        {SECTIONS.map((section, i) => (
          <div
            key={section.key}
            className={`rounded-xl p-5 bg-white border border-border ${section.color} animate-fade-in-up`}
            style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{section.icon}</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {section.label}
              </h3>
            </div>
            <div className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none">
              <Streamdown>{brief[section.key]}</Streamdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function BriefSkeleton({ url }: { url: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[oklch(0.94_0.04_264)] flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-[oklch(0.38_0.12_264)] animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Analyzing website…</p>
            <p className="text-xs text-muted-foreground truncate max-w-xs">{url}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-border shimmer w-full" />
          <div className="h-2 rounded-full bg-border shimmer w-3/4" />
        </div>
      </div>
      <div className="p-6 grid gap-4">
        {SECTIONS.map((section) => (
          <div key={section.key} className={`rounded-xl p-5 border border-border ${section.color}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded shimmer" />
              <div className="h-3 w-40 rounded shimmer" />
            </div>
            <div className="space-y-2">
              <div className="h-2.5 rounded shimmer w-full" />
              <div className="h-2.5 rounded shimmer w-5/6" />
              <div className="h-2.5 rounded shimmer w-4/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── History item ─────────────────────────────────────────────────────────────
function HistoryItem({
  brief,
  isActive,
  isSelected,
  onClick,
  onDelete,
  onToggleCompare,
}: {
  brief: Brief;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onToggleCompare: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive ? "bg-[oklch(0.94_0.04_264)]" : "hover:bg-secondary"
      }`}
      onClick={onClick}
    >
      {/* Compare checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          isSelected
            ? "bg-[oklch(0.38_0.12_264)] border-[oklch(0.38_0.12_264)] text-white"
            : "border-border hover:border-[oklch(0.38_0.12_264)]"
        }`}
        title={isSelected ? "Remove from comparison" : "Add to comparison"}
      >
        {isSelected && <span className="text-[10px] font-bold leading-none">✓</span>}
      </button>
      <div className="w-6 h-6 rounded-md bg-border flex items-center justify-center shrink-0 text-xs">🏢</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{brief.companyName}</p>
        <p className="text-xs text-muted-foreground truncate">{brief.url}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [url, setUrl] = useState("");
  const [activeBrief, setActiveBrief] = useState<Brief | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      else { toast.error("You can compare up to 3 briefs at a time"); }
      return next;
    });
  };

  const handleCompare = () => {
    const ids = Array.from(compareIds).join(",");
    window.location.href = `/compare?ids=${ids}`;
  };

  const utils = trpc.useUtils();

  const generateMutation = trpc.discovery.generate.useMutation({
    onSuccess: (data) => {
      setActiveBrief(data as Brief);
      setUrl("");
      if (isAuthenticated) utils.discovery.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const { data: history = [] } = trpc.discovery.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteMutation = trpc.discovery.delete.useMutation({
    onSuccess: () => {
      utils.discovery.list.invalidate();
      toast.success("Brief deleted");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let normalized = url.trim();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }
    setActiveBrief(null);
    generateMutation.mutate({ url: normalized });
  };

  const isLoading = generateMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-base tracking-tight text-foreground">
              Phase Zero
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowHistory(!showHistory)}
              >
                <Clock className="w-3.5 h-3.5" />
                History
                {history.length > 0 && (
                  <span className="bg-foreground text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {history.length}
                  </span>
                )}
              </Button>
            )}
            {isAuthenticated ? (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {user?.name}
              </span>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" variant="outline" className="text-xs">
                  Sign in to save history
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── History Sidebar ── */}
        {showHistory && isAuthenticated && (
          <aside className="w-72 border-r border-border bg-white flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Brief History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {/* Compare action bar */}
            {compareIds.size >= 2 && (
              <div className="px-3 py-2 border-b border-border bg-[oklch(0.94_0.04_264)]">
                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs bg-[oklch(0.38_0.12_264)] hover:bg-[oklch(0.32_0.12_264)] text-white"
                  onClick={handleCompare}
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  Compare {compareIds.size} Briefs
                </Button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2">
              {history.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Clock className="w-8 h-8 text-border mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No briefs yet. Generate your first one!</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground px-2 py-1.5">Check boxes to compare up to 3 briefs</p>
                  <div className="space-y-0.5">
                  {history.map((b) => (
                    <HistoryItem
                      key={b.id}
                      brief={b as Brief}
                      isActive={activeBrief?.id === b.id}
                      isSelected={compareIds.has(b.id)}
                      onClick={() => {
                        setActiveBrief(b as Brief);
                        setShowHistory(false);
                      }}
                      onDelete={() => deleteMutation.mutate({ id: b.id })}
                      onToggleCompare={() => toggleCompare(b.id)}
                    />
                  ))}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="container py-10 max-w-3xl mx-auto">
            {/* Hero */}
            {!activeBrief && !isLoading && (
              <div className="text-center mb-10 animate-fade-in-up">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full bg-[oklch(0.94_0.04_264)] text-[oklch(0.38_0.12_264)] mb-5">
                  <Sparkles className="w-3 h-3" />
                  Powered by AI
                </div>
                <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-4">
                  Phase Zero
                  <br />
                  <span className="text-[oklch(0.38_0.12_264)]">Discovery Agent</span>
                </h1>
                <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Paste any company URL and get an instant, structured discovery brief — the same analysis a Fluxon PM does on day one of a new engagement.
                </p>
              </div>
            )}

            {/* URL Input Form */}
            <div className={`${activeBrief || isLoading ? "mb-6" : "mb-10"}`}>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="https://company.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                    className="pl-9 h-11 text-sm border-border focus-visible:ring-[oklch(0.38_0.12_264)] bg-white"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !url.trim()}
                  className="h-11 px-5 gap-2 bg-foreground hover:bg-foreground/90 text-white font-semibold text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      Generate Brief
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Loading state */}
            {isLoading && <BriefSkeleton url={url || generateMutation.variables?.url || ""} />}

            {/* Brief output */}
            {activeBrief && !isLoading && (
              <BriefCard
                brief={activeBrief}
                isOwner={isAuthenticated}
                onRegenerate={(updated) => setActiveBrief(updated)}
              />
            )}

            {/* Empty state with feature hints */}
            {!activeBrief && !isLoading && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                {SECTIONS.map((section) => (
                  <div
                    key={section.key}
                    className={`rounded-xl p-5 border border-border bg-white ${section.color} opacity-60`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{section.icon}</span>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {section.label}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 rounded shimmer w-full" />
                      <div className="h-2 rounded shimmer w-4/5" />
                      <div className="h-2 rounded shimmer w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sign-in nudge for anonymous users after generating */}
            {activeBrief && !isAuthenticated && (
              <div className="mt-4 rounded-xl border border-[oklch(0.94_0.04_264)] bg-[oklch(0.97_0.02_264)] p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Save your brief history</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sign in to revisit all your past discovery briefs.
                  </p>
                </div>
                <a href={getLoginUrl()}>
                  <Button size="sm" className="bg-foreground text-white hover:bg-foreground/90 text-xs shrink-0">
                    Sign in
                  </Button>
                </a>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
