import { trpc } from "@/lib/trpc";
import { MetricsBar, type CompanyMetrics, type MetricsConfidence } from "@/components/MetricsBar";
import { Button } from "@/components/ui/button";
import { Copy, Download, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { exportBriefAsPdf } from "@/lib/pdfExport";

const SECTIONS = [
  { key: "valueProposition" as const, label: "Company & Core Value Proposition", icon: "🏢", color: "border-l-[3px] border-l-[oklch(0.38_0.12_264)]" },
  { key: "userPainPoints" as const, label: "Inferred User Pain Points", icon: "⚡", color: "border-l-[3px] border-l-amber-400" },
  { key: "aiOpportunities" as const, label: "AI Opportunity Areas", icon: "🤖", color: "border-l-[3px] border-l-emerald-500" },
  { key: "recommendedEngagement" as const, label: "Recommended Fluxon Engagement Type", icon: "🎯", color: "border-l-[3px] border-l-rose-400" },
];

export default function SharedBriefPage({ token }: { token: string }) {
  const { data: brief, isLoading, error } = trpc.discovery.getByToken.useQuery({ token });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[oklch(0.38_0.12_264)] mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading brief…</p>
        </div>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h2 className="font-display font-bold text-lg text-foreground mb-2">Brief not found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This link may have expired or the brief was deleted.
          </p>
          <a href="/">
            <Button size="sm" className="bg-foreground text-white hover:bg-foreground/90 text-xs">
              Generate your own brief
            </Button>
          </a>
        </div>
      </div>
    );
  }

  let parsedConfidence: MetricsConfidence | undefined;
  if (brief.metricsConfidence) {
    try {
      parsedConfidence = typeof brief.metricsConfidence === "string"
        ? JSON.parse(brief.metricsConfidence)
        : (brief.metricsConfidence as MetricsConfidence);
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const handleExportPdf = () => {
    exportBriefAsPdf({
      companyName: brief.companyName ?? "",
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <a href="/" className="flex items-center hover:opacity-80 transition-opacity" title="Phase Zero — Home">
            <img
              src="/manus-storage/phase-zero-logo-cropped_13401adf.png"
              alt="Phase Zero"
              className="h-6 w-auto object-contain"
            />
          </a>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 text-xs">
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
            <a href="/">
              <Button size="sm" className="bg-foreground text-white hover:bg-foreground/90 text-xs gap-1.5">
                <Sparkles className="w-3 h-3" /> Generate yours
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-10 max-w-3xl mx-auto">
          {/* Shared badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[oklch(0.94_0.04_264)] text-[oklch(0.38_0.12_264)]">
              <Sparkles className="w-3 h-3" />
              Shared Brief
            </span>
            <span className="text-xs text-muted-foreground">
              Generated {new Date(brief.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* Brief card */}
          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm animate-fade-in-up">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <h1 className="font-display text-2xl font-bold text-foreground leading-tight">
                {brief.companyName}
              </h1>
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

            {/* Metrics */}
            <MetricsBar metrics={metrics} pagesScraped={brief.pagesScraped} />

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
                    <Streamdown>{(brief as any)[section.key] || "—"}</Streamdown>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 rounded-xl border border-[oklch(0.94_0.04_264)] bg-[oklch(0.97_0.02_264)] p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Generate your own discovery brief</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste any company URL and get an instant, structured brief — free.
              </p>
            </div>
            <a href="/">
              <Button size="sm" className="bg-foreground text-white hover:bg-foreground/90 text-xs gap-1.5 shrink-0">
                <Sparkles className="w-3 h-3" /> Try it free
              </Button>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
