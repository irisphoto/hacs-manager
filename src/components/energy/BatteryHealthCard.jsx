import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SocGauge from "@/components/axle/SocGauge";

export function BatteryHealthCard({ device, health }) {
  const capacity = health?.capacity_kwh || device?.capacity_kwh || 0;
  const throughput = health?.throughput_kwh || 0;
  const cycles = capacity > 0 ? throughput / (2 * capacity) : 0;
  const status = health?.status || device?.status || "idle";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Battery health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <SocGauge soc={health?.soc ?? device?.soc ?? 0} size={140} />
        </div>
        <div className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="secondary" className="capitalize">{status}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-medium">{capacity ? `${capacity} kWh` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">7-day throughput</span>
            <span className="font-medium">{throughput} kWh</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. cycles (7d)</span>
            <span className="font-medium">{cycles ? cycles.toFixed(1) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reserve floor</span>
            <span className="font-medium">{device?.reserve_soc ?? 20}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BatteryHealthCard;