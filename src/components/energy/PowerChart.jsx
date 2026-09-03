import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import moment from "moment";

const SERIES = [
  { key: "Grid", color: "#f59e0b" },
  { key: "Home", color: "#0ea5e9" },
  { key: "Car", color: "#8b5cf6" },
  { key: "Battery", color: "#34d399" },
];

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid hsl(var(--border))",
  boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
  padding: "8px 12px",
};

export function PowerChart({ hourly = [] }) {
  const data = hourly.map((s) => ({
    time: moment(s.time).format("HH:mm"),
    Grid: s.grid_kw,
    Home: s.home_kw,
    Car: s.car_kw,
    Battery: s.battery_kw,
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <defs>
            {SERIES.map(({ key, color }) => (
              <linearGradient key={key} id={`pw-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={5} tickLine={false} axisLine={false} dy={4} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={48} unit="kW" />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }} />
          <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
          {SERIES.map(({ key, color }) => (
            <Area key={key} type="monotone" dataKey={key} stroke={color} fill={`url(#pw-${key})`} strokeWidth={2.5} activeDot={{ r: 4, strokeWidth: 0 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PowerChart;