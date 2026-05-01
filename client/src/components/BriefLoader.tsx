import { useEffect, useState } from "react";
import { CheckCircle2, Globe, Loader2, Sparkles, Zap } from "lucide-react";

type Step = {
  id: number;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  duration: number; // ms to stay on this step
};

const STEPS: Step[] = [
  {
    id: 1,
    icon: <Globe className="w-4 h-4" />,
    label: "Fetching website",
    sublabel: "Scraping homepage, /about, and /pricing…",
    duration: 3500,
  },
  {
    id: 2,
    icon: <Zap className="w-4 h-4" />,
    label: "Extracting content",
    sublabel: "Parsing and cleaning page content…",
    duration: 2500,
  },
  {
    id: 3,
    icon: <Sparkles className="w-4 h-4" />,
    label: "Analyzing with AI",
    sublabel: "Generating discovery brief and company metrics…",
    duration: 99999, // stays here until done
  },
];

export function BriefLoader({ url }: { url: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dotCount, setDotCount] = useState(1);

  // Advance through steps based on timing
  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, i) => {
      if (i === STEPS.length - 1) return; // last step stays until done
      const timer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, step.id]);
        setCurrentStep(i + 1);
      }, elapsed + step.duration);
      timers.push(timer);
      elapsed += step.duration;
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((d) => (d % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const dots = ".".repeat(dotCount);
  const activeStep = STEPS[currentStep];

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm animate-fade-in-up">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          {/* Pulsing logo area */}
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-full bg-[oklch(0.94_0.04_264)] animate-ping opacity-60" />
            <div className="relative w-10 h-10 rounded-full bg-[oklch(0.94_0.04_264)] flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[oklch(0.38_0.12_264)] animate-spin" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {activeStep.label}{dots}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {activeStep.sublabel}
            </p>
          </div>
        </div>

        {/* URL being analyzed */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
          <Globe className="w-3 h-3 shrink-0" />
          <span className="truncate">{url || "Analyzing website…"}</span>
        </div>
      </div>

      {/* Step progress */}
      <div className="px-6 py-5">
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const isDone = completedSteps.includes(step.id);
            const isActive = currentStep === i && !isDone;
            const isPending = !isDone && !isActive;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isPending ? "opacity-35" : "opacity-100"
                }`}
              >
                {/* Step icon / check */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-[oklch(0.94_0.04_264)] text-[oklch(0.38_0.12_264)]"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Step label */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium leading-none ${
                      isDone
                        ? "text-emerald-600"
                        : isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                    {isActive && (
                      <span className="text-muted-foreground font-normal">{dots}</span>
                    )}
                  </p>
                  {isActive && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      {step.sublabel}
                    </p>
                  )}
                </div>

                {/* Done badge */}
                {isDone && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0">
                    Done
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Animated progress bar */}
        <div className="mt-5 h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-[oklch(0.38_0.12_264)] rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.round(((completedSteps.length + 0.5) / STEPS.length) * 100)}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <p className="text-[10px] text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {Math.round(((completedSteps.length + 0.5) / STEPS.length) * 100)}%
          </p>
        </div>
      </div>

      {/* Shimmer preview of the brief sections */}
      <div className="px-6 pb-6 grid gap-3">
        {["Company & Core Value Proposition", "Inferred User Pain Points", "AI Opportunity Areas", "Recommended Fluxon Engagement Type"].map((label, i) => (
          <div
            key={label}
            className="rounded-xl p-4 border border-border"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded shimmer" />
              <div className="h-2.5 w-36 rounded shimmer" />
            </div>
            <div className="space-y-2">
              <div className="h-2 rounded shimmer w-full" />
              <div className="h-2 rounded shimmer w-5/6" />
              <div className="h-2 rounded shimmer w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
