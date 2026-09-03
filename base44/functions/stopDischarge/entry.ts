import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { postHaWebhook } from '../../shared/ha.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.device_id) return Response.json({ error: 'device_id is required' }, { status: 400 });
    const device = await base44.entities.SolixDevice.get(body.device_id);
    if (!device) return Response.json({ error: 'Device not found' }, { status: 404 });

    // Tell HA to stop discharging / exporting via the anker-export webhook automation
    const webhook = await postHaWebhook({ action: 'stop_discharge' });
    if (!webhook.ok) {
      return Response.json({ error: `Could not reach the Home Assistant webhook: ${webhook.reason}` }, { status: 502 });
    }

    await base44.entities.HaCommand.create({
      command: 'stop_discharge',
      entity_id: 'webhook:anker-export',
      service: 'webhook',
      status: 'delivered',
    });

    return Response.json({ stopped: true, via: 'webhook' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}