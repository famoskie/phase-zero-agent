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
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { exportBriefAsPdf } from "@/lib/pdfExport";
import { formatBriefSection } from "@/lib/formatBrief";
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
  isFavorite?: number | null; // 1 = true, 0 = false
  tags?: string | null; // JSON array string
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

  const briefTags: string[] = (() => { try { return brief.tags ? JSON.parse(brief.tags) as string[] : []; } catch { return []; } })();

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* ── Header ── */}
      <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-border">

        {/* Row 1: company name + action toolbar */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight truncate">
              {brief.companyName}
            </h2>
            <a
              href={brief.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5 transition-colors max-w-full"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{brief.url}</span>
            </a>
          </div>

          {/* Action toolbar — icon buttons on mobile, labeled on desktop */}
          <div className="flex items-center gap-1 shrink-0">
            {isOwner && brief.id && (
              <button
                onClick={() => regenerateMutation.mutate({ id: brief.id! })}
                disabled={regenerateMutation.isPending}
                title="Regenerate brief"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {regenerateMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{regenerateMutation.isPending ? "Regenerating…" : "Regenerate"}</span>
              </button>
            )}
            {isOwner && brief.id && (
              <button
                onClick={() => shareMutation.mutate({ id: brief.id! })}
                disabled={shareMutation.isPending}
                title="Copy share link"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {shareMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
            <button onClick={handleCopy} title="Copy as text" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </button>
            {/* Export dropdown-style: two small buttons */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden divide-x divide-border">
              <button onClick={handleExportMd} title="Export Markdown" className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">MD</span>
              </button>
              <button onClick={handleExportPdf} title="Export PDF" className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: metadata pills */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[oklch(0.94_0.04_264)] text-[oklch(0.38_0.12_264)]">
            <Sparkles className="w-2.5 h-2.5" />
            Phase Zero
          </span>
          <span className="text-[11px] text-muted-foreground">
            {new Date(brief.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          {brief.isFavorite ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500">
              <Star className="w-3 h-3 fill-amber-400" /> Favorited
            </span>
          ) : null}
          {briefTags.map((tag) => (
            <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[oklch(0.94_0.04_264)] text-[oklch(0.38_0.12_264)] border border-[oklch(0.88_0.06_264)]">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Metrics Bar */}
      <MetricsBar metrics={metrics} pagesScraped={brief.pagesScraped} pagesSummary={brief.pagesSummary} />

      {/* Sections */}
      <div className="p-4 sm:p-6 grid gap-3">
        {SECTIONS.map((section, i) => (
          <div
            key={section.key}
            className={`rounded-xl p-4 sm:p-5 bg-white border border-border ${section.color} animate-fade-in-up`}
            style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-sm">{section.icon}</span>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {section.label}
              </h3>
            </div>
            <div className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none [&_ul]:mt-1.5 [&_ul]:space-y-1.5 [&_li]:leading-snug [&_strong]:font-semibold [&_strong]:text-foreground">
              <Streamdown>{formatBriefSection(brief[section.key])}</Streamdown>
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

// ─── Tag input component ─────────────────────────────────────────────────────
function TagInput({ briefId, currentTags, onUpdate }: { briefId: number; currentTags: string[]; onUpdate: () => void }) {
  const [input, setInput] = useState("");
  const setTagsMutation = trpc.favorites.setTags.useMutation({ onSuccess: onUpdate });

  const addTag = () => {
    const tag = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || currentTags.includes(tag) || currentTags.length >= 10) return;
    setTagsMutation.mutate({ id: briefId, tags: [...currentTags, tag] });
    setInput("");
  };

  const removeTag = (tag: string) => {
    setTagsMutation.mutate({ id: briefId, tags: currentTags.filter((t) => t !== tag) });
  };

  return (
    <div className="px-2 pb-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {currentTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[oklch(0.94_0.04_264)] text-[oklch(0.38_0.12_264)] border border-[oklch(0.88_0.06_264)]"
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors leading-none">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder="Add tag…"
          className="flex-1 text-[10px] px-2 py-1 rounded border border-border bg-secondary focus:outline-none focus:border-[oklch(0.38_0.12_264)] min-w-0"
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="text-[10px] px-2 py-1 rounded bg-[oklch(0.38_0.12_264)] text-white disabled:opacity-40 hover:bg-[oklch(0.32_0.12_264)] transition-colors"
        >
          +
        </button>
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
  onRefresh,
}: {
  brief: Brief;
  isActive: boolean;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onToggleCompare: () => void;
  onRefresh: () => void;
}) {
  const [showTags, setShowTags] = useState(false);
  const isFav = !!brief.isFavorite;
  const parsedTags: string[] = (() => { try { return brief.tags ? JSON.parse(brief.tags) : []; } catch { return []; } })();

  const favMutation = trpc.favorites.toggleFavorite.useMutation({ onSuccess: onRefresh });

  return (
    <div className={`rounded-lg transition-colors ${isActive ? "bg-[oklch(0.94_0.04_264)]" : "hover:bg-secondary"}`}>
      <div
        className="group flex items-center gap-2 px-2 py-2 cursor-pointer"
        onClick={onClick}
      >
        {/* Compare checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            isSelected ? "bg-[oklch(0.38_0.12_264)] border-[oklch(0.38_0.12_264)] text-white" : "border-border hover:border-[oklch(0.38_0.12_264)]"
          }`}
          title={isSelected ? "Remove from comparison" : "Add to comparison"}
        >
          {isSelected && <span className="text-[9px] font-bold leading-none">✓</span>}
        </button>

        {/* Star */}
        <button
          onClick={(e) => { e.stopPropagation(); favMutation.mutate({ id: brief.id, value: !isFav }); }}
          className={`shrink-0 p-0.5 rounded transition-colors ${
            isFav ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-400"
          }`}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-400" : ""}`} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{brief.companyName}</p>
          {parsedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {parsedTags.slice(0, 3).map((t) => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[oklch(0.94_0.04_264)] text-[oklch(0.38_0.12_264)] font-medium">{t}</span>
              ))}
              {parsedTags.length > 3 && <span className="text-[9px] text-muted-foreground">+{parsedTags.length - 3}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => { e.stopPropagation(); setShowTags((v) => !v); }}
            className="p-1 rounded hover:bg-secondary transition-colors"
            title="Manage tags"
          >
            <Tag className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {showTags && (
        <TagInput briefId={brief.id} currentTags={parsedTags} onUpdate={onRefresh} />
      )}
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
  const [historyFilter, setHistoryFilter] = useState<{ favoritesOnly?: boolean; tag?: string }>({});
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

  const [inputError, setInputError] = useState<string | null>(null);

  const generateMutation = trpc.discovery.generate.useMutation({
    onSuccess: (data) => {
      setActiveBrief(data as Brief);
      setUrl("");
      setInputError(null);
      utils.favorites.listFiltered.invalidate();
      utils.favorites.allTags.invalidate();
    },
    // No toast — error is shown inline below the form
  });

  const { data: history = [], refetch: refetchHistory } = trpc.favorites.listFiltered.useQuery(historyFilter);
  const { data: allTags = [] } = trpc.favorites.allTags.useQuery();

  const deleteMutation = trpc.discovery.delete.useMutation({
    onSuccess: () => {
      utils.favorites.listFiltered.invalidate();
      utils.favorites.allTags.invalidate();
      toast.success("Brief deleted");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    // Normalize: add https:// if missing
    let normalized = trimmed;
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }

    // Basic format check before sending to server
    try {
      const parsed = new URL(normalized);
      if (!parsed.hostname.includes(".")) {
        setInputError("Please enter a valid website URL, e.g. https://company.com");
        return;
      }
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname.startsWith("127.") ||
        parsed.hostname.startsWith("192.168.") ||
        parsed.hostname.startsWith("10.")
      ) {
        setInputError("Please enter a public website URL, not a local address.");
        return;
      }
    } catch {
      setInputError("Please enter a valid website URL, e.g. https://company.com");
      return;
    }

    setInputError(null);
    setActiveBrief(null);
    generateMutation.mutate({ url: normalized });
  };

  const isLoading = generateMutation.isPending;
  const generateError = generateMutation.error?.message ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); setActiveBrief(null); setUrl(""); }}
            className="flex items-center hover:opacity-80 transition-opacity"
            title="Phase Zero — Home"
          >
            <img
              src="/manus-storage/phase-zero-logo-cropped_13401adf.png"
              alt="Phase Zero"
              className="h-6 w-auto object-contain"
            />
          </a>
          <div className="flex items-center gap-2">
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
            {user?.name && (
              <span className="text-xs text-muted-foreground hidden sm:block">{user.name}</span>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── History Sidebar ── */}
        {showHistory && (
          <aside className="w-72 border-r border-border bg-white flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Brief History</h2>
              <button onClick={() => setShowHistory(false)} className="p-1 rounded hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {/* Filter bar */}
            <div className="px-3 py-2 border-b border-border bg-secondary/30 flex flex-wrap gap-1.5">
              <button
                onClick={() => setHistoryFilter({})}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                  !historyFilter.favoritesOnly && !historyFilter.tag
                    ? "bg-foreground text-white border-foreground"
                    : "bg-white text-muted-foreground border-border hover:border-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setHistoryFilter({ favoritesOnly: true })}
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                  historyFilter.favoritesOnly
                    ? "bg-amber-400 text-white border-amber-400"
                    : "bg-white text-muted-foreground border-border hover:border-amber-400"
                }`}
              >
                <Star className="w-2.5 h-2.5" /> Favorites
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setHistoryFilter({ tag })}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                    historyFilter.tag === tag
                      ? "bg-[oklch(0.38_0.12_264)] text-white border-[oklch(0.38_0.12_264)]"
                      : "bg-white text-muted-foreground border-border hover:border-[oklch(0.38_0.12_264)]"
                  }`}
                >
                  #{tag}
                </button>
              ))}
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
                      onRefresh={() => {
                        utils.favorites.listFiltered.invalidate();
                        utils.favorites.allTags.invalidate();
                      }}
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
                    onChange={(e) => { setUrl(e.target.value); if (inputError) setInputError(null); if (generateMutation.error) generateMutation.reset(); }}
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

              {/* Inline error — shown directly below the form, not in a corner */}
              {(inputError || (generateError && !isLoading && !activeBrief)) && (
                <div className="mt-3 rounded-xl border border-destructive/25 bg-red-50 px-4 py-3.5 flex items-start gap-3 animate-fade-in-up">
                  <span className="shrink-0 mt-0.5 text-destructive">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-destructive leading-tight">
                      {inputError ? "Invalid URL" : "Could not generate brief"}
                    </p>
                    <p className="text-xs text-destructive/75 mt-1 leading-relaxed">
                      {inputError || generateError}
                    </p>
                  </div>
                  <button
                    onClick={() => { setInputError(null); generateMutation.reset(); }}
                    className="shrink-0 ml-auto text-destructive/50 hover:text-destructive transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Loading state */}
            {isLoading && <BriefSkeleton url={url || generateMutation.variables?.url || ""} />}

            {/* Brief output */}
            {activeBrief && !isLoading && (
              <BriefCard
                brief={activeBrief}
                isOwner={true}
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


          </div>
        </main>
      </div>
    </div>
  );
}
