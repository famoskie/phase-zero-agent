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
  Loader2,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Streamdown } from "streamdown";

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
function BriefCard({ brief }: { brief: Brief }) {
  const handleCopy = () => {
    const text = `# Phase Zero Discovery Brief\n**Company:** ${brief.companyName}\n**URL:** ${brief.url}\n**Generated:** ${new Date(brief.createdAt).toLocaleDateString()}\n\n---\n\n## Company & Core Value Proposition\n${brief.valueProposition}\n\n## Inferred User Pain Points\n${brief.userPainPoints}\n\n## AI Opportunity Areas\n${brief.aiOpportunities}\n\n## Recommended Fluxon Engagement Type\n${brief.recommendedEngagement}`;
    navigator.clipboard.writeText(text);
    toast.success("Brief copied to clipboard");
  };

  const handleExport = () => {
    const text = `# Phase Zero Discovery Brief\n**Company:** ${brief.companyName}\n**URL:** ${brief.url}\n**Generated:** ${new Date(brief.createdAt).toLocaleDateString()}\n\n---\n\n## Company & Core Value Proposition\n${brief.valueProposition}\n\n## Inferred User Pain Points\n${brief.userPainPoints}\n\n## AI Opportunity Areas\n${brief.aiOpportunities}\n\n## Recommended Fluxon Engagement Type\n${brief.recommendedEngagement}`;
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phase-zero-${brief.companyName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Brief exported as Markdown");
  };

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
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export
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
  onClick,
  onDelete,
}: {
  brief: Brief;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive ? "bg-[oklch(0.94_0.04_264)]" : "hover:bg-secondary"
      }`}
      onClick={onClick}
    >
      <div className="w-7 h-7 rounded-md bg-border flex items-center justify-center shrink-0 text-xs">
        🏢
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{brief.companyName}</p>
        <p className="text-xs text-muted-foreground truncate">{brief.url}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
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
  const inputRef = useRef<HTMLInputElement>(null);

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
            <div className="flex-1 overflow-y-auto p-2">
              {history.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Clock className="w-8 h-8 text-border mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No briefs yet. Generate your first one!</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {history.map((b) => (
                    <HistoryItem
                      key={b.id}
                      brief={b as Brief}
                      isActive={activeBrief?.id === b.id}
                      onClick={() => {
                        setActiveBrief(b as Brief);
                        setShowHistory(false);
                      }}
                      onDelete={() => deleteMutation.mutate({ id: b.id })}
                    />
                  ))}
                </div>
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
            {activeBrief && !isLoading && <BriefCard brief={activeBrief} />}

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
