import { cn } from "@/lib/utils";

export default function StatCard({ icon, label, value, unit, color = "teal", trend, className }) {
  const colorMap = {
    teal: "bg-teal-light text-primary",
    gold: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className={cn("bg-card rounded-2xl p-5 shadow-sm border border-border/60 flex flex-col gap-3", className)}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg", colorMap[color])}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">
          {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
        </p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
    </div>
  );
}