import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { MAPPED_FIELDS, buildDevicePatch, listAllSnapshots, chunk, cleanStr } from '../../shared/ha.ts';

const HOUR_MS = 3600 * 1000;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const url = new URL(req.url);
    const key = body.key || req.headers.get('x-webhook-key') || url.searchParams.get('key') || '';
    const expected = (secrets.get('HA_TOKEN') || '').trim();
    if (!expected) return Response.json({ error: 'Webhook key not configured' }, { status: 500 });
    if (key !== expected) return Response.json({ error: 'Invalid webhook key' }, { status: 403 });

    // sanitize incoming states (dedupe by entity_id, last one wins)
    const incomingMap = new Map();
    for (const s of (Array.isArray(body.states) ? body.states : []).slice(0, 2000)) {
      if (!s || !s.entity_id) continue;
      const entityId = cleanStr(s.entity_id, 100);
      if (!entityId.includes('.')) continue;
      incomingMap.set(entityId, {
        entity_id: entityId,
        state: cleanStr(s.state),
        unit: cleanStr(s.unit, 20),
        friendly_name: cleanStr(s.friendly_name),
      });
    }
    const incoming = Array.from(incomingMap.values());

    // diff against stored snapshots
    const existing = await listAllSnapshots(db);
    const byId = new Map(existing.map((e) => [e.entity_id, e]));
    const toCreate = [];
    const toUpdate = [];
    for (const s of incoming) {
      const cur = byId.get(s.entity_id);
      if (!cur) toCreate.push(s);
      else if (cur.state !== s.state || (cur.unit || '') !== s.unit || (cur.friendly_name || '') !== s.friendly_name) {
        toUpdate.push({ id: cur.id, ...s });
      }
    }
    for (const part of chunk(toCreate, 500)) await db.entities.HaStateSnapshot.bulkCreate(part);
    for (const part of chunk(toUpdate, 500)) await db.entities.HaStateSnapshot.bulkUpdate(part);

    // sync devices and record at most one reading per entity per hour
    const devices = await db.entities.SolixDevice.list();
    const hourStart = new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS).toISOString();
    const readingsThisHour = await db.entities.HaReading.filter({ recorded_at: { $gte: hourStart } }, 'entity_id', 500);
    const recorded = new Set(readingsThisHour.map((r) => r.entity_id));

    const devicePatches = [];
    const toRecord = [];
    for (const dev of devices) {
      const patch = buildDevicePatch(dev, incomingMap);
      if (Object.keys(patch).length > 0) devicePatches.push({ id: dev.id, ...patch });
      for (const f of MAPPED_FIELDS) {
        const id = dev[f];
        if (!id || recorded.has(id)) continue;
        const s = incomingMap.get(id);
        if (!s) continue;
        const v = parseFloat(s.state);
        if (isNaN(v)) continue;
        toRecord.push({ entity_id: id, value: Math.round(v * 100) / 100, recorded_at: new Date().toISOString() });
        recorded.add(id);
      }
    }
    if (devicePatches.length > 0) await db.entities.SolixDevice.bulkUpdate(devicePatches);
    for (const part of chunk(toRecord, 500)) await db.entities.HaReading.bulkCreate(part);

    return Response.json({
      ok: true,
      received: incoming.length,
      created: toCreate.length,
      updated: toUpdate.length,
      readings: toRecord.length,
      devicesSynced: devicePatches.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}