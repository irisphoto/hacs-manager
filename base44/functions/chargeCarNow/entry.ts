import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { SERVICES, postHaWebhook } from '../../shared/ha.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.device_id) return Response.json({ error: 'device_id is required' }, { status: 400 });
    const device = await base44.entities.SolixDevice.get(body.device_id);
    if (!device) return Response.json({ error: 'Device not found' }, { status: 404 });

    // Preferred path: push straight to the HA webhook automation —
    // it starts the EV charger and sets the X1 to self-consumption.
    const webhook = await postHaWebhook({ action: 'charge_ev', priority: 'battery_first' });
    if (webhook.ok) {
      await base44.entities.HaCommand.create({
        command: 'charge_ev',
        entity_id: 'webhook:anker-export',
        service: 'webhook',
        status: 'delivered',
      });
      return Response.json({ started: true, via: 'webhook' });
    }

    // Fallback: queue a service call HA picks up via its pull automation
    const entity = device.ha_car_charge_entity;
    if (!entity) {
      return Response.json({
        error: `Could not reach the Home Assistant webhook (${webhook.reason}). Expose HA via HA_BASE_URL or add a charger control entity in the sensor settings.`,
      }, { status: 400 });
    }
    const domain = entity.split('.')[0];
    const service = SERVICES[domain];
    if (!service) {
      return Response.json({
        error: `Unsupported entity type "${domain}". Use a switch, button, script, input_boolean or automation entity.`,
      }, { status: 400 });
    }

    await base44.entities.HaCommand.create({
      command: 'charge_car',
      entity_id: entity,
      service,
      status: 'pending',
    });

    return Response.json({ started: true, via: 'queue', queued: true, entity });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}