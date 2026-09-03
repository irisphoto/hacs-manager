import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { chunk } from '../../shared/ha.ts';

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

    const pending = await db.entities.HaCommand.filter({ status: 'pending' }, 'created_date', 10);
    const commands = pending.map((c) => ({
      id: c.id,
      command: c.command,
      entity_id: c.entity_id,
      service: c.service,
    }));
    for (const part of chunk(pending.map((c) => ({ id: c.id, status: 'delivered' })), 500)) {
      await db.entities.HaCommand.bulkUpdate(part);
    }

    return Response.json({ ok: true, commands });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}