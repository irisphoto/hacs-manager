import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const deviceId = body.device_id;
    if (!deviceId) return Response.json({ error: 'device_id is required' }, { status: 400 });

    const device = await base44.entities.SolixDevice.get(deviceId);
    if (!device) return Response.json({ error: 'Device not found' }, { status: 404 });

    const baseUrl = (Deno.env.get('HA_BASE_URL') || '').replace(/\/+$/, '');
    const token = Deno.env.get('HA_TOKEN');
    if (!baseUrl || !token) return Response.json({ error: 'Home Assistant not configured' }, { status: 500 });

    const fetchState = async (entityId) => {
      const res = await fetch(`${baseUrl}/api/states/${encodeURIComponent(entityId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Home Assistant returned ${res.status} for ${entityId}. ${detail}`);
      }
      return res.json();
    };

    const patch = {};

    if (device.ha_soc_entity) {
      const s = await fetchState(device.ha_soc_entity);
      const val = parseFloat(s.state);
      if (!isNaN(val)) patch.soc = Math.max(0, Math.min(100, Math.round(val)));
    }
    if (device.ha_power_entity) {
      const s = await fetchState(device.ha_power_entity);
      const val = parseFloat(s.state);
      if (!isNaN(val)) patch.power_kw = Math.round(val * 10) / 10;
    }
    if (device.ha_status_entity) {
      const s = await fetchState(device.ha_status_entity);
      const raw = String(s.state || '').toLowerCase();
      let status = 'idle';
      if (raw.includes('discharg')) status = 'discharging';
      else if (raw.includes('charg')) status = 'charging';
      else if (raw.includes('offline') || raw.includes('unavail')) status = 'offline';
      patch.status = status;
    }

    if (Object.keys(patch).length === 0) {
      return Response.json({ error: 'No Home Assistant entities configured for this device' }, { status: 400 });
    }

    const updated = await base44.entities.SolixDevice.update(deviceId, patch);
    return Response.json({ device: updated, applied: patch });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});