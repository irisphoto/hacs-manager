import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { listAllSnapshots, isSolix, findSolixMapping } from '../../shared/ha.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.device_id) return Response.json({ error: 'device_id is required' }, { status: 400 });
    const device = await base44.entities.SolixDevice.get(body.device_id);
    if (!device) return Response.json({ error: 'Device not found' }, { status: 404 });

    const snapshots = await listAllSnapshots(base44);
    if (snapshots.length === 0) {
      return Response.json({
        connected: false,
        reason: 'No data received from Home Assistant yet. Set up and start the push automation in Home Assistant, then try again.',
      });
    }

    const solixCount = snapshots.filter(isSolix).length;
    if (solixCount === 0) {
      return Response.json({
        connected: false,
        reason: 'No Solix entities found in the received Home Assistant data. Install the Anker Solix integration in Home Assistant first, then try again.',
      });
    }

    const mapping = findSolixMapping(snapshots);
    const found = Object.fromEntries(Object.entries(mapping).filter(([, v]) => v));
    if (!found.ha_soc_entity && !found.ha_power_entity) {
      return Response.json({
        connected: false,
        reason: `Found ${solixCount} Solix entities but could not identify the battery sensors. Map them manually in the Home Assistant sensor settings.`,
      });
    }

    const patch = Object.fromEntries(Object.entries(found).map(([k, e]) => [k, e.entity_id]));
    await base44.entities.SolixDevice.update(device.id, patch);

    return Response.json({ connected: true, mappedCount: Object.keys(patch).length, mapped: patch });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}