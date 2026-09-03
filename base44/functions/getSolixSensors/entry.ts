import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { listAllSnapshots, isSolix, isSupportedDomain } from '../../shared/ha.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const snapshots = await listAllSnapshots(base44);
    const sensors = snapshots
      .filter((s) => isSolix(s) && isSupportedDomain(s))
      .slice(0, 200)
      .map((s) => ({
        entity_id: s.entity_id,
        name: s.friendly_name || s.entity_id,
        state: s.state,
        unit: s.unit,
      }));

    let lastPush = null;
    for (const s of snapshots) {
      const t = new Date(s.updated_date).getTime();
      if (!isNaN(t) && (lastPush === null || t > lastPush)) lastPush = t;
    }

    return Response.json({
      source: 'home_assistant_push',
      last_push: lastPush === null ? null : new Date(lastPush).toISOString(),
      sensors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}