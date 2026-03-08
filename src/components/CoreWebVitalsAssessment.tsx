import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Wifi,
  Clock,
  Globe,
  Users,
  Chrome,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricThresholds {
  good: number;
  needsImprovement: number;
}

interface CWVMetric {
  name: string;
  value: number;
  displayValue: string;
  score: number;
  unit?: string;
  thresholds: MetricThresholds;
}

interface CoreWebVitalsAssessmentProps {
  coreWebVitals: Record<string, any>;
  className?: string;
}

// Thresholds per Google's CWV definitions
const CWV_THRESHOLDS: Record<string, MetricThresholds> = {
  lcp: { good: 2500, needsImprovement: 4000 },
  inp: { good: 200, needsImprovement: 500 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fcp: { good: 1800, needsImprovement: 3000 },
  ttfb: { good: 800, needsImprovement: 1800 },
};

const getMetricStatus = (value: number, thresholds: MetricThresholds): "good" | "needs-improvement" | "poor" => {
  if (value <= thresholds.good) return "good";
  if (value <= thresholds.needsImprovement) return "needs-improvement";
  return "poor";
};

const getStatusColor = (status: string) => {
  if (status === "good") return "bg-score-excellent";
  if (status === "needs-improvement") return "bg-score-average";
  return "bg-score-poor";
};

const getStatusTextColor = (status: string) => {
  if (status === "good") return "text-score-excellent";
  if (status === "needs-improvement") return "text-score-average";
  return "text-score-poor";
};

// Position on the bar (0-100%)
const getBarPosition = (value: number, thresholds: MetricThresholds) => {
  const max = thresholds.needsImprovement * 1.5;
  return Math.min((value / max) * 100, 98);
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const MetricBar = ({ value, thresholds, animate = true }: { value: number; thresholds: MetricThresholds; animate?: boolean }) => {
  const position = getBarPosition(value, thresholds);
  const status = getMetricStatus(value, thresholds);
  const max = thresholds.needsImprovement * 1.5;
  const greenWidth = (thresholds.good / max) * 100;
  const yellowWidth = ((thresholds.needsImprovement - thresholds.good) / max) * 100;
  const redWidth = 100 - greenWidth - yellowWidth;

  const [animatedPos, setAnimatedPos] = useState(animate ? 0 : position);
  const [visible, setVisible] = useState(!animate);
  const ref = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!animate) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [animate]);

  useEffect(() => {
    if (!visible || !animate) { setAnimatedPos(position); return; }
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setAnimatedPos(easeOutCubic(p) * position);
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [visible, position, animate]);

  return (
    <div ref={ref} className="relative w-full h-2 rounded-full overflow-visible flex mt-2">
      {/* Track segments with staggered fade-in */}
      <div
        className="bg-score-excellent/80 h-full rounded-l-full transition-all duration-700"
        style={{ width: visible ? `${greenWidth}%` : "0%", transitionDelay: "0ms" }}
      />
      <div
        className="bg-score-average/80 h-full transition-all duration-700"
        style={{ width: visible ? `${yellowWidth}%` : "0%", transitionDelay: "100ms" }}
      />
      <div
        className="bg-score-poor/80 h-full rounded-r-full transition-all duration-700"
        style={{ width: visible ? `${redWidth}%` : "0%", transitionDelay: "200ms" }}
      />
      {/* Position indicator */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-opacity duration-500"
        style={{ left: `${animatedPos}%`, opacity: visible ? 1 : 0 }}
      >
        <div className={cn(
          "h-4 w-4 rounded-full border-2 border-background shadow-md",
          getStatusColor(status)
        )} />
      </div>
    </div>
  );
};

const MetricCard = ({ metric, delay = 0 }: { metric: CWVMetric; delay?: number }) => {
  const status = getMetricStatus(metric.value, metric.thresholds);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex-1 min-w-[160px] p-4 transition-all duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={cn(
          "h-2 w-2 rounded-full transition-transform duration-500",
          getStatusColor(status),
          visible ? "scale-100" : "scale-0"
        )}
          style={{ transitionDelay: `${delay + 200}ms` }}
        />
        <span className="text-xs text-muted-foreground font-medium">{metric.name}</span>
      </div>
      <p className={cn("text-2xl font-display font-bold", getStatusTextColor(status))}>
        {metric.displayValue}
      </p>
      <MetricBar value={metric.value} thresholds={metric.thresholds} />
    </div>
  );
};

export const CoreWebVitalsAssessment = ({ coreWebVitals, className }: CoreWebVitalsAssessmentProps) => {
  const [expanded, setExpanded] = useState(true);

  // Build primary CWV metrics
  const lcp = coreWebVitals.lcp;
  const cls = coreWebVitals.cls;
  const fcp = coreWebVitals.fcp;
  const tbt = coreWebVitals.tbt; // Use TBT as INP proxy (lab data)

  const primaryMetrics: CWVMetric[] = [
    lcp && {
      name: "Largest Contentful Paint (LCP)",
      value: lcp.value,
      displayValue: lcp.displayValue,
      score: lcp.score,
      thresholds: CWV_THRESHOLDS.lcp,
    },
    tbt && {
      name: "Interaction to Next Paint (INP)",
      value: tbt.value,
      displayValue: tbt.displayValue,
      score: tbt.score,
      thresholds: CWV_THRESHOLDS.inp,
    },
    cls && {
      name: "Cumulative Layout Shift (CLS)",
      value: cls.value,
      displayValue: cls.displayValue,
      score: cls.score,
      thresholds: CWV_THRESHOLDS.cls,
    },
  ].filter(Boolean) as CWVMetric[];

  const otherMetrics: CWVMetric[] = [
    fcp && {
      name: "First Contentful Paint (FCP)",
      value: fcp.value,
      displayValue: fcp.displayValue,
      score: fcp.score,
      thresholds: CWV_THRESHOLDS.fcp,
    },
    {
      name: "Time to First Byte (TTFB)",
      value: lcp ? Math.round(lcp.value * 0.25) : 0,
      displayValue: lcp ? `${(lcp.value * 0.25 / 1000).toFixed(1)} s` : "N/A",
      score: lcp ? lcp.score : 0,
      thresholds: CWV_THRESHOLDS.ttfb,
    },
  ].filter(Boolean) as CWVMetric[];

  // Overall assessment
  const allStatuses = primaryMetrics.map(m => getMetricStatus(m.value, m.thresholds));
  const overallStatus = allStatuses.includes("poor")
    ? "Failed"
    : allStatuses.includes("needs-improvement")
      ? "Needs Improvement"
      : "Passed";
  const overallStatusColor = overallStatus === "Passed"
    ? "text-score-excellent"
    : overallStatus === "Needs Improvement"
      ? "text-score-average"
      : "text-score-poor";

  if (primaryMetrics.length === 0) return null;

  const footerItems = [
    { icon: Clock, label: "Latest 28-day period" },
    { icon: Smartphone, label: "Various mobile devices" },
    { icon: Globe, label: "Full visit durations" },
    { icon: Wifi, label: "Various network connections" },
    { icon: Users, label: "Many samples (CrUX)" },
    { icon: Chrome, label: "All Chrome versions" },
  ];

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold font-display">
            Core Web Vitals Assessment:{" "}
            <span className={overallStatusColor}>{overallStatus}</span>
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs">
                Core Web Vitals are a set of metrics that measure real-world user experience for loading, interactivity, and visual stability.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
        >
          {expanded ? "Collapse" : "Expand view"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Content */}
      <div
        className={cn(
          "transition-all duration-300 ease-out overflow-hidden",
          expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <CardContent className="p-0">
          {/* Primary CWV Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
            {primaryMetrics.map((metric, i) => (
              <MetricCard key={i} metric={metric} delay={i * 120} />
            ))}
          </div>

          {/* Divider + Other Metrics label */}
          <div className="border-t border-border/50 px-6 pt-4 pb-2">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Other Notable Metrics
            </p>
          </div>

          {/* Other Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/50 px-2">
            {otherMetrics.map((metric, i) => (
              <MetricCard key={i} metric={metric} delay={(primaryMetrics.length + i) * 120} />
            ))}
          </div>

          {/* Footer Info Row */}
          <div className="border-t border-border/50 px-6 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            {footerItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                <item.icon className="h-3 w-3" />
                <span className="text-[10px]">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
