import { getLevelInfo } from "@/lib/utils";

export default function LevelRing({ lifetimePoints = 0, size = 180 }) {
  const { level, title, emoji, progress } = getLevelInfo(lifetimePoints);
  
  // Adjusted radius to accommodate a thicker stroke (12 instead of 8)
  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" 
            stroke="hsl(var(--border))" 
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        {/* Centered Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-5xl mb-1">{emoji}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
            Level {level}
          </span>
          <h2 className="font-display text-xl font-bold text-primary leading-none">
            {title}
          </h2>
          <span className="text-xs font-black text-foreground mt-1">
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
}