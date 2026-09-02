import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const itemId = body.item_id;
    if (!itemId) return Response.json({ error: 'item_id is required' }, { status: 400 });

    const item = await base44.entities.HacsItem.get(itemId);
    if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });

    const baseUrl = (Deno.env.get('HA_BASE_URL') || '').replace(/\/+$/, '');
    const token = Deno.env.get('HA_TOKEN');

    let notified = false;
    let notifyError = null;
    if (baseUrl && token) {
      try {
        const message = `Install ${item.name} (${item.category}) in HACS.\nRepo: ${item.repo_full_name}\n${item.repository_url}`;
        const res = await fetch(`${baseUrl}/api/services/persistent_notification/create`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            title: `HACS install: ${item.name}`,
            notification_id: `hacs_install_${item.id}`
          })
        });
        notified = res.ok;
        if (!res.ok) notifyError = `HA returned ${res.status}`;
      } catch (e) {
        notifyError = e.message;
      }
    }

    const updated = await base44.entities.HacsItem.update(itemId, {
      installed: true,
      installed_version: item.version,
      downloads: (item.downloads || 0) + 1
    });

    return Response.json({ item: updated, notified, notifyError });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});