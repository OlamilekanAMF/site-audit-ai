import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
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

export const ScoreGauge = ({ score, size = 120, strokeWidth = 8, label, className }: ScoreGaugeProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColorHsl(score);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn("rounded-full relative", getScoreBgClass(score))} style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
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
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-display font-bold", getScoreTextClass(score))}
            style={{ fontSize: size * 0.28 }}
          >
            {score}
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
