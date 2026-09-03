import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import moment from "moment";

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
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <defs>
            {[["gGrid", "#f59e0b"], ["gHome", "#0ea5e9"], ["gCar", "#8b5cf6"], ["gBatt", "#34d399"]].map(([id, color]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={5} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} unit="kW" />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="Grid" stroke="#f59e0b" fill="url(#gGrid)" strokeWidth={2} />
          <Area type="monotone" dataKey="Home" stroke="#0ea5e9" fill="url(#gHome)" strokeWidth={2} />
          <Area type="monotone" dataKey="Car" stroke="#8b5cf6" fill="url(#gCar)" strokeWidth={2} />
          <Area type="monotone" dataKey="Battery" stroke="#34d399" fill="url(#gBatt)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PowerChart;