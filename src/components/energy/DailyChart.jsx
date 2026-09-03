import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import moment from "moment";

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
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52} unit="kWh" />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Home" stackId="usage" fill="#0ea5e9" />
          <Bar dataKey="Car" stackId="usage" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="Grid import" stroke="#f59e0b" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DailyChart;