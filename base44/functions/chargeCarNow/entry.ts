import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const SERVICES = {
  switch: 'switch/turn_on',
  button: 'button/press',
  script: 'script/turn_on',
  input_boolean: 'input_boolean/turn_on',
  automation: 'automation/trigger',
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.device_id) return Response.json({ error: 'device_id is required' }, { status: 400 });
    const device = await base44.entities.SolixDevice.get(body.device_id);
    if (!device) return Response.json({ error: 'Device not found' }, { status: 404 });

    const entity = device.ha_car_charge_entity;
    if (!entity) {
      return Response.json({
        error: 'No car charger control entity configured. Add a switch, button or script entity in the Home Assistant sensor settings.',
      }, { status: 400 });
    }
    const domain = entity.split('.')[0];
    const service = SERVICES[domain];
    if (!service) {
      return Response.json({
        error: `Unsupported entity type "${domain}". Use a switch, button, script, input_boolean or automation entity.`,
      }, { status: 400 });
    }

    const baseUrl = (secrets.get('HA_BASE_URL') || '').replace(/\/+$/, '');
    const token = secrets.get('HA_TOKEN');
    if (!baseUrl || !token) return Response.json({ error: 'Home Assistant is not configured' }, { status: 500 });

    const res = await fetch(`${baseUrl}/api/services/${service}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entity }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return Response.json({ error: `Home Assistant returned ${res.status}. ${detail}`.trim() }, { status: 502 });
    }

    // best-effort read of the fresh state
    let state = null;
    try {
      const stateRes = await fetch(`${baseUrl}/api/states/${encodeURIComponent(entity)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (stateRes.ok) state = (await stateRes.json()).state;
    } catch (_) { /* state read is optional */ }

    return Response.json({ started: true, entity, state });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}