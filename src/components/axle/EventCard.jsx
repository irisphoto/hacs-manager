import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, PoundSterling, Zap, Power, Check, Activity } from "lucide-react";

const STATUS_BADGE = {
  scheduled: { variant: "secondary", label: "Scheduled", cls: "" },
  active: { variant: "default", label: "Active", cls: "text-emerald-400" },
  completed: { variant: "secondary", label: "Completed", cls: "" },
  skipped: { variant: "secondary", label: "Skipped", cls: "" }
};

export function EventCard({ event, deviceEnrolled, isDischargingThisEvent, onStart, onStop, onComplete }) {
  const meta = STATUS_BADGE[event.status] || STATUS_BADGE.scheduled;
  const canStart = event.status === "scheduled" && deviceEnrolled && !isDischargingThisEvent;
  const canComplete = event.status === "active";
  const canStop = event.status === "active" && isDischargingThisEvent;

  return (
    <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground truncate">{event.title}</h3>
              <Badge variant={meta.variant} className={`text-[10px] ${meta.cls}`}>{meta.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(event.start_time).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{event.power_kw}kW export</span>
              <span className="flex items-center gap-1"><PoundSterling className="h-3 w-3" />£{event.reward_gbp?.toFixed(2)}</span>
            </div>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        {(canStart || canStop || canComplete) && (
          <div className="flex gap-2 mt-3">
            {canStart && <Button size="sm" onClick={() => onStart(event)}><Power className="h-3.5 w-3.5 mr-1.5" />Start discharge</Button>}
            {canStop && <Button size="sm" variant="outline" onClick={onStop}><Power className="h-3.5 w-3.5 mr-1.5" />Stop</Button>}
            {canComplete && <Button size="sm" onClick={() => onComplete(event)}><Check className="h-3.5 w-3.5 mr-1.5" />Complete</Button>}
          </div>
        )}
        {event.status === "completed" && event.energy_delivered_kwh > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">Delivered {event.energy_delivered_kwh.toFixed(1)}kWh to grid.</div>
        )}
      </CardContent>
    </Card>
  );
}

export default EventCard;