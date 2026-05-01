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

export type CompanyMetrics = {
  foundedYear?: string | null;
  employeeCount?: string | null;
  fundingStage?: string | null;
  industry?: string | null;
  headquarters?: string | null;
  businessModel?: string | null;
  techStack?: string | null;
  revenueModel?: string | null;
};

type MetricItem = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function MetricChip({ icon, label, value }: MetricItem) {
  const isUnknown = !value || value.toLowerCase() === "unknown";
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border min-w-0">
      <span className={`shrink-0 ${isUnknown ? "text-muted-foreground/40" : "text-[oklch(0.38_0.12_264)]"}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">
          {label}
        </p>
        <p className={`text-sm font-medium truncate leading-snug ${isUnknown ? "text-muted-foreground/50 italic" : "text-foreground"}`}>
          {isUnknown ? "Unknown" : value}
        </p>
      </div>
    </div>
  );
}

export function MetricsBar({ metrics }: { metrics: CompanyMetrics }) {
  const items: MetricItem[] = [
    {
      icon: <Layers className="w-3.5 h-3.5" />,
      label: "Industry",
      value: metrics.industry || "",
    },
    {
      icon: <Building2 className="w-3.5 h-3.5" />,
      label: "Business Model",
      value: metrics.businessModel || "",
    },
    {
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      label: "Funding Stage",
      value: metrics.fundingStage || "",
    },
    {
      icon: <Users className="w-3.5 h-3.5" />,
      label: "Team Size",
      value: metrics.employeeCount || "",
    },
    {
      icon: <Calendar className="w-3.5 h-3.5" />,
      label: "Founded",
      value: metrics.foundedYear || "",
    },
    {
      icon: <Globe className="w-3.5 h-3.5" />,
      label: "HQ",
      value: metrics.headquarters || "",
    },
    {
      icon: <CircleDollarSign className="w-3.5 h-3.5" />,
      label: "Revenue Model",
      value: metrics.revenueModel || "",
    },
    {
      icon: <Code2 className="w-3.5 h-3.5" />,
      label: "Tech Stack",
      value: metrics.techStack || "",
    },
  ];

  return (
    <div className="px-6 py-4 border-b border-border bg-secondary/30">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Company Snapshot
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <MetricChip key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}
