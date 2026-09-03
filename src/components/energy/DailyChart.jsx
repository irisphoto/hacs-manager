import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import moment from "moment";

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid hsl(var(--border))",
  boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
  padding: "8px 12px",
};

export function DailyChart({ daily = [] }) {
  const data = daily.map((d) => ({
    date: moment(d.date).format("ddd D"),
    Home: d.home_kwh,
    Car: d.car_kwh,
    "Grid import": d.grid_kwh,
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} dy={4} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={52} unit="kWh" />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
          <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
          <Bar dataKey="Home" stackId="usage" fill="#0ea5e9" maxBarSize={36} radius={[0, 0, 0, 0]} />
          <Bar dataKey="Car" stackId="usage" fill="#8b5cf6" maxBarSize={36} radius={[6, 6, 0, 0]} />
          <Line type="monotone" dataKey="Grid import" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DailyChart;