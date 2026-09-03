import React from "react";
import { cn } from "@/lib/utils";

const ACCENTS = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  lime: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

export default function SensorCard({ icon: Icon, label, value, unit, accent = "slate", sub, compact = false }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", ACCENTS[accent] || ACCENTS.slate)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <span className="truncate text-xs font-medium text-muted-foreground" title={label}>
          {label}
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1">
        <span className={cn("font-semibold tracking-tight tabular-nums text-foreground", compact ? "text-lg" : "text-2xl")}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}