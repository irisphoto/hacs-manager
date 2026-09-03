import React from "react";
import {
  BatteryCharging, ArrowDownCircle, ArrowUpCircle, Sun, Home as HomeIcon,
  Car, Plug, Zap, Activity, Gauge,
} from "lucide-react";
import SensorCard from "./SensorCard";

const isLive = (s) => s && s.state && s.state !== "unavailable" && s.state !== "unknown";

const KEY_DEFS = [
  { match: "state_of_charge", label: "Battery charge", icon: BatteryCharging, accent: "emerald" },
  { match: "discharge_power", label: "Discharging", icon: ArrowDownCircle, accent: "emerald" },
  { match: "charge_power", label: "Charging", icon: ArrowUpCircle, accent: "lime" },
  { match: "solar_power", label: "Solar", icon: Sun, accent: "amber" },
  { match: "home_demand", label: "Home demand", icon: HomeIcon, accent: "sky" },
  { match: "ev_charging_power", label: "EV charging", icon: Car, accent: "pink" },
  { match: "grid_import", label: "Grid import", icon: Plug, accent: "violet" },
];

const DAILY_ICONS = [
  { match: "discharge", icon: ArrowDownCircle, accent: "emerald" },
  { match: "charge", icon: ArrowUpCircle, accent: "lime" },
  { match: "solar", icon: Sun, accent: "amber" },
  { match: "home", icon: HomeIcon, accent: "sky" },
  { match: "grid", icon: Plug, accent: "violet" },
  { match: "share_battery", icon: Gauge, accent: "slate" },
];

export default function SensorCards({ sensors = [] }) {
  const live = sensors.filter(isLive);
  const unavailableCount = sensors.length - live.length;
  const used = new Set();

  const findBy = (needle) => live.find((s) => !s.entity_id.includes("_daily_") && s.entity_id.includes(needle));

  const batteryEnergy = findBy("battery_energy");
  const gridStatus = findBy("grid_status");

  const keyCards = KEY_DEFS.map((def) => {
    const s = findBy(def.match);
    if (!s) return null;
    used.add(s.entity_id);
    let sub;
    if (def.match === "state_of_charge" && batteryEnergy) {
      used.add(batteryEnergy.entity_id);
      const kwh = (parseFloat(batteryEnergy.state) / 1000).toFixed(2);
      sub = `${kwh} kWh stored`;
    }
    if (def.match === "grid_import" && gridStatus) {
      used.add(gridStatus.entity_id);
      sub = `Grid status: ${gridStatus.state}`;
    }
    return { ...def, key: s.entity_id, value: s.state, unit: s.unit, sub };
  }).filter(Boolean);

  const dailySensors = live.filter((s) => s.entity_id.includes("_daily_") && !used.has(s.entity_id));
  dailySensors.forEach((s) => used.add(s.entity_id));

  const otherSensors = live.filter((s) => !used.has(s.entity_id));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {keyCards.map((c) => (
          <SensorCard key={c.key} icon={c.icon} label={c.label} value={c.value} unit={c.unit} accent={c.accent} sub={c.sub} />
        ))}
      </div>

      {dailySensors.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {dailySensors.map((s) => {
              const def = DAILY_ICONS.find((d) => s.entity_id.includes(d.match)) || { icon: Zap, accent: "slate" };
              return (
                <SensorCard
                  key={s.entity_id}
                  compact
                  icon={def.icon}
                  accent={def.accent}
                  label={(s.name || s.entity_id).replace(/^.*Daily\s*/i, "")}
                  value={s.state}
                  unit={s.unit}
                />
              );
            })}
          </div>
        </div>
      )}

      {otherSensors.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All sensors ({otherSensors.length})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {otherSensors.map((s) => (
              <SensorCard key={s.entity_id} compact icon={Zap} accent="slate" label={s.name || s.entity_id} value={s.state} unit={s.unit} />
            ))}
          </div>
        </div>
      )}

      {unavailableCount > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {unavailableCount} sensor{unavailableCount === 1 ? "" : "s"} currently unavailable in Home Assistant
          {unavailableCount > 0 ? " (hidden for clarity)" : ""}.
        </p>
      )}
    </div>
  );
}