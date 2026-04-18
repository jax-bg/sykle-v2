import { getLevelInfo } from "@/lib/utils";

export default function LevelRing({ lifetimePoints = 0, size = 120 }) {
  const { level, title, emoji, progress, next } = getLevelInfo(lifetimePoints);
  const radius = (size - 16) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="hsl(var(--border))" strokeWidth="8"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">{emoji}</span>
          <span className="text-xs font-bold text-primary">Lv.{level}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        {next && <p className="text-xs text-muted-foreground">{progress}% to {next.title}</p>}
      </div>
    </div>
  );
}