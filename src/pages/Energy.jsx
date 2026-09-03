import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Activity, ArrowRight, Wifi, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import EnergyFlowDiagram from "@/components/energy/EnergyFlowDiagram";
import PowerChart from "@/components/energy/PowerChart";
import DailyChart from "@/components/energy/DailyChart";
import BatteryHealthCard from "@/components/energy/BatteryHealthCard";

export default function Energy() {
  const [device, setDevice] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true);
    try {
      const devices = await base44.entities.SolixDevice.list();
      const d = devices[0] || null;
      setDevice(d);
      if (d) {
        const res = await base44.functions.invoke("getEnergyStats", { device_id: d.id });
        setStats(res.data);
      }
    } catch (error) {
      toast({ title: "Could not load energy stats", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Energy</h1>
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <p className="text-sm text-muted-foreground">No battery connected yet.</p>
            <Button asChild size="sm">
              <Link to="/axle-solix">Connect your Anker Solix <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latest = stats?.hourly?.[stats.hourly.length - 1] || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-500" />Energy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Battery health and energy flow for {device.name}.</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <Badge variant={stats.source === "home_assistant" ? "default" : "secondary"} className="gap-1">
              {stats.source === "home_assistant"
                ? <><Wifi className="h-3 w-3" />Live from Home Assistant</>
                : <><WifiOff className="h-3 w-3" />Demo data</>}
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => load(false)} disabled={loading || refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Energy flow</CardTitle>
            <CardDescription>Live power between grid, battery, home and car.</CardDescription>
          </CardHeader>
          <CardContent>
            <EnergyFlowDiagram
              flows={latest}
              soc={stats?.health?.soc ?? device.soc}
              status={stats?.health?.status || device.status}
            />
          </CardContent>
        </Card>
        <BatteryHealthCard device={device} health={stats?.health} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Power over the last 24 hours</CardTitle>
          <CardDescription>kilowatts per hour — battery power is positive when discharging.</CardDescription>
        </CardHeader>
        <CardContent>
          <PowerChart hourly={stats?.hourly || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily energy usage</CardTitle>
          <CardDescription>kilowatt-hours per day over the last 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <DailyChart daily={stats?.daily || []} />
        </CardContent>
      </Card>
    </div>
  );
}