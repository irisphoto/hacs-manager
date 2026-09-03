import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const text = (e) => `${e.entity_id} ${(e.attributes && e.attributes.friendly_name) || ''}`.toLowerCase();

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.device_id) return Response.json({ error: 'device_id is required' }, { status: 400 });
    const device = await base44.entities.SolixDevice.get(body.device_id);
    if (!device) return Response.json({ error: 'Device not found' }, { status: 404 });

    const baseUrl = (secrets.get('HA_BASE_URL') || '').replace(/\/+$/, '');
    const token = secrets.get('HA_TOKEN');
    if (!baseUrl || !token) return Response.json({ error: 'Home Assistant is not configured' }, { status: 500 });

    const res = await fetch(`${baseUrl}/api/states`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (compatible; HACS-Manager/1.0)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      return Response.json({
        connected: false,
        reason: `Home Assistant returned ${res.status}. Make sure it is online and reachable from the internet, then try again.`,
      });
    }
    const states = await res.json();

    // every entity mentioning solix (entity id or friendly name)
    const solix = (Array.isArray(states) ? states : []).filter((s) => text(s).includes('solix'));
    if (solix.length === 0) {
      return Response.json({
        connected: false,
        reason: 'No Solix entities found in Home Assistant. Install the Anker Solix integration in Home Assistant first, then try again.',
      });
    }

    const find = (pred) => solix.find((e) => pred(text(e)));
    const mapping = {
      ha_soc_entity: find((t) => /soc|state_of_charge|battery_level/.test(t)),
      ha_power_entity: find((t) => t.includes('power') && !/grid|meter|home|load|consumption|car|ev|charger|vehicle/.test(t)),
      ha_status_entity: find((t) => /status|operating|mode/.test(t)),
      ha_grid_entity: find((t) => /grid|meter/.test(t) && !/car|ev|charger/.test(t)),
      ha_home_entity: find((t) => /home|load|consumption|house/.test(t)),
      ha_car_entity: find((t) => /car|ev|charger|vehicle/.test(t)),
    };

    const found = Object.fromEntries(Object.entries(mapping).filter(([, v]) => v));
    if (!found.ha_soc_entity && !found.ha_power_entity) {
      return Response.json({
        connected: false,
        reason: `Found ${solix.length} Solix entities but could not identify the battery sensors. Map them manually in the Home Assistant sensor settings.`,
      });
    }

    const patch = Object.fromEntries(Object.entries(found).map(([k, e]) => [k, e.entity_id]));
    await base44.entities.SolixDevice.update(device.id, patch);

    return Response.json({ connected: true, mappedCount: Object.keys(patch).length, mapped: patch });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}