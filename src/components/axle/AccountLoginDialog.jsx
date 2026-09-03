import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function AccountLoginDialog({ open, onOpenChange, title, description, fields, values, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && values) {
      const next = {};
      fields.forEach((f) => { next[f.key] = values[f.key] || ""; });
      setForm(next);
    }
  }, [open, values]);

  const save = async () => {
    setSaving(true);
    try {
      const patch = {};
      fields.forEach((f) => { patch[f.key] = (form[f.key] || "").trim(); });
      await onSave(patch);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}</Label>
              <Input
                type={f.type || "text"}
                placeholder={f.placeholder}
                value={form[f.key] || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AccountLoginDialog;