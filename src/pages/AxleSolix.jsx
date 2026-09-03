import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SocGauge } from "@/components/axle/SocGauge";
import { EventCard } from "@/components/axle/EventCard";
import { Link2, Zap, Waves, Battery, PoundSterling, Check, Loader2, Plug, RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { HaSettingsDialog } from "@/components/axle/HaSettingsDialog";
import { AccountLoginDialog } from "@/components/axle/AccountLoginDialog";

const ANKER_FIELDS = [
  { key: "anker_account", label: "Email", type: "email", placeholder: "you@example.com" },
  { key: "anker_password", label: "Password", type: "password", placeholder: "Your Anker account password" },
];

const OCTOPUS_FIELDS = [
  { key: "octopus_account", label: "Email", type: "email", placeholder: "you@example.com" },
  { key: "octopus_api_key", label: "API key", type: "password", placeholder: "Your Octopus Energy API key" },
];

export default function AxleSolix() {
  const [device, setDevice] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [haOpen, setHaOpen] = useState(false);
  const [ankerOpen, setAnkerOpen] = useState(false);
  const [octopusOpen, setOctopusOpen] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const devs = await base44.entities.SolixDevice.list("-created_date", 1);
      if (devs[0]) {
        const d = devs[0];
        setDevice(d);
        const evs = await base44.entities.AxleEvent.filter({ device_id: d.id }, "-start_time", 20);
        setEvents(evs || []);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateDevice = async (patch) => {
    if (!device) return;
    setBusy(true);
    try {
      const updated = await base44.entities.SolixDevice.update(device.id, patch);
      setDevice(updated);
    } finally { setBusy(false); }
  };

  const saveAnkerLogin = async (patch) => {
    await updateDevice({ ...patch, anker_connected: true });
    setAnkerOpen(false);
    toast({ title: "Anker Solix connected", description: "Your battery account is linked." });
  };
  const saveOctopusLogin = async (patch) => {
    await updateDevice({ ...patch, octopus_connected: true });
    setOctopusOpen(false);
    toast({ title: "Octopus Energy connected", description: "Your energy account is linked." });
  };
  const connectAxle = () => {
    updateDevice({ axle_connected: true, axle_account: "you@axle.energy" });
    toast({ title: "Axle Energy connected", description: "Accounts are now linked." });
  };
  const toggleEnroll = () => {
    const next = !device.axle_enrolled;
    updateDevice({ axle_enrolled: next });
    toast({ title: next ? "Enrolled in flexibility" : "Unenrolled", description: next ? "Your battery can join grid events." : "You won't join new events." });
  };

  const startDischarge = async (ev) => {
    await base44.entities.AxleEvent.update(ev.id, { status: "active" });
    await updateDevice({ status: "discharging", power_kw: ev.power_kw });
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: "active" } : e));
    toast({ title: "Discharging to grid", description: `${ev.power_kw}kW export active.` });
  };
  const stopDischarge = async () => {
    await updateDevice({ status: "idle", power_kw: 0 });
    toast({ title: "Discharge stopped" });
  };
  const completeEvent = async (ev) => {
    const kwh = ev.power_kw * 1;
    await base44.entities.AxleEvent.update(ev.id, { status: "completed", energy_delivered_kwh: kwh });
    const updated = await base44.entities.SolixDevice.update(device.id, {
      total_earnings_gbp: (device.total_earnings_gbp || 0) + (ev.reward_gbp || 0),
      status: "idle",
      power_kw: 0,
      soc: Math.max(device.reserve_soc || 20, (device.soc || 0) - Math.round((kwh / (device.capacity_kwh || 5)) * 100))
    });
    setDevice(updated);
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: "completed", energy_delivered_kwh: kwh } : e));
    toast({ title: "Event completed", description: `Earned £${ev.reward_gbp.toFixed(2)}.` });
  };

  const syncFromHA = async () => {
    if (!device) return;
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncSolixFromHA", { device_id: device.id });
      setDevice(res.data.device);
      toast({ title: "Synced from Home Assistant", description: "Live battery data updated." });
    } catch (e) {
      toast({ title: "Sync failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const saveHaSettings = async (patch) => {
    const updated = await base44.entities.SolixDevice.update(device.id, patch);
    setDevice(updated);
    setHaOpen(false);
    toast({ title: "Sensor mapping saved" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const linked = device?.anker_connected && device?.axle_connected;
  const dischargingEventId = events.find(e => e.status === "active")?.id;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Link2 className="h-5 w-5 text-sky-400" /> Axle Energy × Anker Solix
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Link your Anker Solix battery to Axle Energy to earn from grid flexibility events.</p>
      </div>

      {/* Connection flow / status */}
      <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${device?.anker_connected ? "bg-emerald-500/10" : "bg-muted"}`}>
                <Battery className={`h-4 w-4 ${device?.anker_connected ? "text-emerald-400" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Anker Solix</div>
                <div className="text-xs text-muted-foreground truncate">{device?.anker_connected ? device.anker_account : "Not connected"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${device?.axle_connected ? "bg-sky-500/10" : "bg-muted"}`}>
                <Zap className={`h-4 w-4 ${device?.axle_connected ? "text-sky-400" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Axle Energy</div>
                <div className="text-xs text-muted-foreground truncate">{device?.axle_connected ? device.axle_account : "Not connected"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${device?.octopus_connected ? "bg-emerald-500/10" : "bg-muted"}`}>
                <Waves className={`h-4 w-4 ${device?.octopus_connected ? "text-emerald-400" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Octopus Energy</div>
                <div className="text-xs text-muted-foreground truncate">{device?.octopus_connected ? device.octopus_account : "Not connected"}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            <Button size="sm" variant={device?.anker_connected ? "outline" : "default"} onClick={() => setAnkerOpen(true)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plug className="h-4 w-4 mr-1.5" />}
              {device?.anker_connected ? "Update Anker details" : "Connect Anker Solix"}
            </Button>
            <Button size="sm" variant={device?.octopus_connected ? "outline" : "default"} onClick={() => setOctopusOpen(true)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plug className="h-4 w-4 mr-1.5" />}
              {device?.octopus_connected ? "Update Octopus details" : "Connect Octopus Energy"}
            </Button>
            {device?.anker_connected && !device?.axle_connected && (
              <Button size="sm" onClick={connectAxle} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plug className="h-4 w-4 mr-1.5" />}Connect Axle Energy
              </Button>
            )}
            {linked && (
              <Badge variant="secondary" className="text-xs"><Check className="h-3 w-3 mr-1" />Accounts linked</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard */}
      {linked && device && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Battery */}
            <Card className="lg:col-span-2 bg-card/40 border-border/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">{device.name}</div>
                    <div className="text-xs text-muted-foreground">{device.capacity_kwh}kWh · {device.serial}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={device.status === "discharging" ? "default" : "secondary"} className="text-xs capitalize">
                      {device.status}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={syncFromHA} disabled={syncing} title="Sync from Home Assistant">
                      {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHaOpen(true)} title="Home Assistant sensors">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                  <SocGauge soc={device.soc || 0} />
                  <div className="grid grid-cols-2 gap-4 flex-1 w-full">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <div className="text-xs text-muted-foreground">Power</div>
                      <div className="text-lg font-semibold text-foreground tabular-nums">{(device.power_kw || 0).toFixed(1)}kW</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <div className="text-xs text-muted-foreground">Capacity</div>
                      <div className="text-lg font-semibold text-foreground tabular-nums">{device.capacity_kwh}kWh</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <div className="text-xs text-muted-foreground">Reserve floor</div>
                      <div className="text-lg font-semibold text-foreground tabular-nums">{device.reserve_soc}%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <div className="text-xs text-muted-foreground">Earnings</div>
                      <div className="text-lg font-semibold text-foreground tabular-nums flex items-center gap-1"><PoundSterling className="h-4 w-4" />{(device.total_earnings_gbp || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enrollment */}
            <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="text-sm font-medium text-foreground">Flexibility programme</div>
                <p className="text-xs text-muted-foreground mt-1">Enrol your battery to participate in Axle Energy grid events and earn rewards.</p>
                <div className="mt-auto pt-4">
                  {device.axle_enrolled ? (
                    <Button variant="outline" size="sm" className="w-full" onClick={toggleEnroll} disabled={busy}>Unenrol</Button>
                  ) : (
                    <Button size="sm" className="w-full" onClick={toggleEnroll} disabled={busy}>Enrol battery</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-sky-400" />Grid events</h2>
            {events.length === 0 ? (
              <Card className="bg-card/40 border-border/50"><CardContent className="py-10 text-center text-sm text-muted-foreground">No events scheduled.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {events.map(ev => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    deviceEnrolled={device.axle_enrolled}
                    isDischargingThisEvent={ev.id === dischargingEventId}
                    onStart={startDischarge}
                    onStop={stopDischarge}
                    onComplete={completeEvent}
                  />
                ))}
              </div>
            )}
          </div>

          <HaSettingsDialog open={haOpen} onOpenChange={setHaOpen} device={device} onSave={saveHaSettings} />
        </>
      )}

      {device && (
        <>
          <AccountLoginDialog
            open={ankerOpen}
            onOpenChange={setAnkerOpen}
            title="Anker Solix account"
            description="Sign in with the account your Solix battery is registered to."
            fields={ANKER_FIELDS}
            values={device}
            onSave={saveAnkerLogin}
          />
          <AccountLoginDialog
            open={octopusOpen}
            onOpenChange={setOctopusOpen}
            title="Octopus Energy account"
            description="Use the email and API key from your Octopus Energy account (Settings → API access)."
            fields={OCTOPUS_FIELDS}
            values={device}
            onSave={saveOctopusLogin}
          />
        </>
      )}
    </div>
  );
}