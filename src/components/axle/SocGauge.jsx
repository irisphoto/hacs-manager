import React from "react";

export function SocGauge({ soc = 0, size = 150 }) {
  const r = (size - 20) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, soc));
  const offset = c - (clamped / 100) * c;
  const color = soc > 60 ? "#34d399" : soc > 25 ? "#fbbf24" : "#f87171";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-foreground tabular-nums">{Math.round(soc)}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">charge</span>
      </div>
    </div>
  );
}

export default SocGauge;