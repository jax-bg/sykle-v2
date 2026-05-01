import { getLevelInfo } from "@/lib/utils";

export default function LevelRing({ lifetimePoints = 0, size = 180 }) {
  const { emoji, progress } = getLevelInfo(lifetimePoints);
  
  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress / 100);

  return (
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
      {/* Visual Only Center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-5xl">{emoji}</span>
      </div>
    </div>
  );
}