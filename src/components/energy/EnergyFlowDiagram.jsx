import React from "react";
import { BatteryCharging, Home, Car, UtilityPole } from "lucide-react";

const round1 = (v) => Math.round(v * 10) / 10;

const STATUS_COLOR = {
  charging: "#34d399",
  discharging: "#38bdf8",
  idle: "#94a3b8",
  offline: "#64748b",
};

const GEOM = {
  grid_battery: { d: "M 124 170 H 286", mid: [205, 158] },
  grid_home: { d: "M 90 136 C 180 44, 460 44, 550 66", mid: [320, 52] },
  grid_car: { d: "M 90 204 C 180 296, 460 296, 550 274", mid: [320, 288] },
  battery_home: { d: "M 348 148 L 520 112", mid: [434, 118] },
  battery_car: { d: "M 348 192 L 520 228", mid: [434, 222] },
};

const LINE_COLOR = {
  grid_battery: "#f59e0b",
  grid_home: "#f59e0b",
  grid_car: "#f59e0b",
  battery_home: "#34d399",
  battery_car: "#34d399",
};

export function EnergyFlowDiagram({ flows, soc = 0, status = "idle" }) {
  const b = flows?.battery_kw || 0;
  const g = flows?.grid_kw || 0;
  const home = Math.max(0, flows?.home_kw || 0);
  const car = Math.max(0, flows?.car_kw || 0);
  const battOut = Math.max(0, b);
  const battIn = Math.max(0, -b);
  const gridIn = Math.max(0, g);
  const gridOut = Math.max(0, -g);
  const demand = home + car;

  const lines = [];
  const add = (key, value, reverse = false) => {
    if (value > 0.05) lines.push({ key, value: round1(value), reverse });
  };

  if (gridOut > 0.05) {
    // exporting to grid: battery powers home, car and the grid
    add("grid_battery", gridOut, true);
    const fromBatt = Math.min(battOut, demand);
    add("battery_home", demand > 0 ? fromBatt * (home / demand) : 0);
    add("battery_car", demand > 0 ? fromBatt * (car / demand) : 0);
  } else {
    const fromBatt = Math.min(battOut, demand);
    add("battery_home", demand > 0 ? fromBatt * (home / demand) : 0);
    add("battery_car", demand > 0 ? fromBatt * (car / demand) : 0);
    const fromGrid = demand - fromBatt;
    add("grid_home", demand > 0 ? fromGrid * (home / demand) : 0);
    add("grid_car", demand > 0 ? fromGrid * (car / demand) : 0);
    add("grid_battery", Math.min(battIn, gridIn));
  }

  const statusColor = STATUS_COLOR[status] || STATUS_COLOR.idle;
  const battFlow = b > 0.05 ? "discharging" : b < -0.05 ? "charging" : "idle";

  const Node = ({ x, y, Icon, label, value, sub, color }) => (
    <g transform={`translate(${x},${y})`}>
      <circle r="34" className="fill-card" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <g transform="translate(-11,-11)">
        <Icon width="22" height="22" style={{ color }} />
      </g>
      <text y="50" textAnchor="middle" className="fill-foreground text-[11px] font-medium">{label}</text>
      <text y="63" textAnchor="middle" className="fill-muted-foreground text-[10px]">{value}</text>
      {sub && <text y="74" textAnchor="middle" className="fill-muted-foreground text-[9px]">{sub}</text>}
    </g>
  );

  return (
    <div>
      <svg viewBox="0 0 640 330" className="w-full h-auto">
        {/* faint topology lines */}
        {Object.values(GEOM).map((geom) => (
          <path key={geom.d} d={geom.d} fill="none" className="stroke-border" strokeWidth="2" />
        ))}

        {/* active flows */}
        {lines.map((l) => {
          const geom = GEOM[l.key];
          return (
            <g key={l.key}>
              <path
                d={geom.d}
                fill="none"
                stroke={LINE_COLOR[l.key]}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.9"
                className={l.reverse ? "flow-dash-rev" : "flow-dash"}
              />
              <text
                x={geom.mid[0]}
                y={geom.mid[1]}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-semibold"
                stroke="hsl(var(--card))"
                strokeWidth="4"
                paintOrder="stroke"
              >
                {l.value} kW
              </text>
            </g>
          );
        })}

        <Node x={90} y={170} Icon={UtilityPole} label="Grid" color="#f59e0b"
          value={`${Math.abs(g).toFixed(1)} kW`} sub={g < -0.05 ? "exporting" : g > 0.05 ? "importing" : ""} />
        <Node x={320} y={170} Icon={BatteryCharging} label="Battery" color={statusColor}
          value={`${Math.round(soc)}%`} sub={battFlow} />
        <Node x={550} y={100} Icon={Home} label="Home" color="#0ea5e9"
          value={`${home.toFixed(1)} kW`} sub="consumption" />
        <Node x={550} y={240} Icon={Car} label="Car" color="#8b5cf6"
          value={`${car.toFixed(1)} kW`} sub={car > 0.05 ? "charging" : "idle"} />
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Grid {Math.abs(g).toFixed(1)} kW {g < -0.05 ? "export" : "import"}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Battery {Math.abs(b).toFixed(1)} kW {battFlow}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />Home {home.toFixed(1)} kW</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />Car {car.toFixed(1)} kW</span>
      </div>
    </div>
  );
}

export default EnergyFlowDiagram;