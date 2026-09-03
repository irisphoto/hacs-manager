import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { listAllSnapshots, buildDevicePatch } from '../../shared/ha.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const deviceId = body.device_id;
    if (!deviceId) return Response.json({ error: 'device_id is required' }, { status: 400 });

    const device = await base44.entities.SolixDevice.get(deviceId);
    if (!device) return Response.json({ error: 'Device not found' }, { status: 404 });

    const snapshots = await listAllSnapshots(base44);
    const stateMap = new Map(snapshots.map((s) => [s.entity_id, s]));
    const patch = buildDevicePatch(device, stateMap);

    if (Object.keys(patch).length === 0) {
      return Response.json({ error: 'No Home Assistant entities configured for this device, or no data received yet.' }, { status: 400 });
    }

    const updated = await base44.entities.SolixDevice.update(deviceId, patch);
    return Response.json({ device: updated, applied: patch });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}