import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Activity, ArrowRight, Wifi, WifiOff, Zap, Loader2 } from "lucide-react";
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
  const [sensors, setSensors] = useState(null);
  const [chargingNow, setChargingNow] = useState(false);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true);
    try {
      const devices = await base44.entities.SolixDevice.list();
      const d = devices[0] || null;
      setDevice(d);
      if (d) {
        const [statsRes, sensorsRes] = await Promise.all([
          base44.functions.invoke("getEnergyStats", { device_id: d.id }),
          base44.functions.invoke("getSolixSensors", { device_id: d.id }).catch(() => ({ data: { sensors: [] } })),
        ]);
        setStats(statsRes.data);
        setSensors(sensorsRes.data.sensors || []);
      }
    } catch (error) {
      toast({ title: "Could not load energy stats", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const chargeNow = async () => {
    setChargingNow(true);
    try {
      const res = await base44.functions.invoke("chargeCarNow", { device_id: device.id });
      toast({ title: "Car charging started", description: `Triggered ${res.data.entity}.` });
    } catch (error) {
      const detail = error.response?.data?.error || error.message;
      toast({ title: "Could not start charging", description: detail, variant: "destructive" });
    } finally {
      setChargingNow(false);
    }
  };

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
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Energy flow</CardTitle>
              <CardDescription>Live power between grid, battery, home and car.</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Button size="sm" onClick={chargeNow} disabled={chargingNow || !device.ha_car_charge_entity}>
                {chargingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}Charge Now
              </Button>
              {!device.ha_car_charge_entity && (
                <span className="text-[10px] text-muted-foreground text-right">Add the charger entity in HA sensors</span>
              )}
            </div>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Anker X1 sensors</CardTitle>
            <CardDescription>Everything Home Assistant reports for your Solix system.</CardDescription>
          </div>
          <Badge variant="secondary">{sensors?.length || 0}</Badge>
        </CardHeader>
        <CardContent>
          {sensors === null ? (
            <Skeleton className="h-24 w-full" />
          ) : sensors.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No Solix sensors found. Check that Home Assistant is reachable and your Solix integration is installed.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {sensors.map((s) => (
                <div key={s.entity_id} className="rounded-lg border border-border p-2.5">
                  <div className="truncate text-[11px] text-muted-foreground" title={s.entity_id}>{s.name}</div>
                  <div className="text-sm font-semibold">
                    {s.state} <span className="text-xs font-normal text-muted-foreground">{s.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}