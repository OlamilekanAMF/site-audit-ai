import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  animate?: boolean;
}

const getScoreColorHsl = (score: number) => {
  if (score >= 90) return "hsl(var(--score-excellent))";
  if (score >= 50) return "hsl(var(--score-average))";
  return "hsl(var(--score-poor))";
};

const getScoreBgClass = (score: number) => {
  if (score >= 90) return "bg-score-excellent/10";
  if (score >= 50) return "bg-score-average/10";
  return "bg-score-poor/10";
};

const getScoreTextClass = (score: number) => {
  if (score >= 90) return "text-score-excellent";
  if (score >= 50) return "text-score-average";
  return "text-score-poor";
};

// Easing function for smooth deceleration
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const ScoreGauge = ({ score, size = 120, strokeWidth = 8, label, className, animate = true }: ScoreGaugeProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedScore, setAnimatedScore] = useState(animate ? 0 : score);
  const [hasAnimated, setHasAnimated] = useState(!animate);
  const ref = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>();

  // Intersection Observer to trigger animation on visibility
  useEffect(() => {
    if (!animate || hasAnimated) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate, hasAnimated]);

  // Animate score count-up
  useEffect(() => {
    if (!hasAnimated || !animate) {
      setAnimatedScore(score);
      return;
    }

    const duration = 1200;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setAnimatedScore(Math.round(from + (score - from) * eased));
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hasAnimated, score, animate]);

  const displayScore = animatedScore;
  const offset = circumference - (displayScore / 100) * circumference;
  const color = getScoreColorHsl(displayScore);

  return (
    <div ref={ref} className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn("rounded-full relative", getScoreBgClass(displayScore))} style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
            opacity={0.5}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-display font-bold tabular-nums", getScoreTextClass(displayScore))}
            style={{ fontSize: size * 0.28 }}
          >
            {displayScore}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
};

export { getScoreColorHsl, getScoreBgClass, getScoreTextClass };
