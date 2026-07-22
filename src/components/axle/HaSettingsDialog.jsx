import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function HaSettingsDialog({ open, onOpenChange, device, onSave }) {
  const [socEntity, setSocEntity] = useState("");
  const [powerEntity, setPowerEntity] = useState("");
  const [statusEntity, setStatusEntity] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (device) {
      setSocEntity(device.ha_soc_entity || "");
      setPowerEntity(device.ha_power_entity || "");
      setStatusEntity(device.ha_status_entity || "");
    }
  }, [device]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ ha_soc_entity: socEntity.trim(), ha_power_entity: powerEntity.trim(), ha_status_entity: statusEntity.trim() });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Home Assistant sensors</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>State of charge entity</Label>
            <Input placeholder="sensor.solix_battery_soc" value={socEntity} onChange={(e) => setSocEntity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Power flow entity</Label>
            <Input placeholder="sensor.solix_power" value={powerEntity} onChange={(e) => setPowerEntity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Status entity</Label>
            <Input placeholder="sensor.solix_status" value={statusEntity} onChange={(e) => setStatusEntity(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Paste the exact Home Assistant entity IDs (Settings → Devices &amp; Services → your Solix device). Positive power is treated as discharging.</p>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HaSettingsDialog;