import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { SERVICES } from '../../shared/ha.ts';

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

    await base44.entities.HaCommand.create({
      command: 'charge_car',
      entity_id: entity,
      service,
      status: 'pending',
    });

    return Response.json({ started: true, queued: true, entity });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}