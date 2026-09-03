import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const baseUrl = (secrets.get('HA_BASE_URL') || '').replace(/\/+$/, '');
    const token = secrets.get('HA_TOKEN');
    if (!baseUrl || !token) return Response.json({ source: 'unavailable', sensors: [] });

    const res = await fetch(`${baseUrl}/api/states`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return Response.json({ error: `Home Assistant returned ${res.status}`, body: body.slice(0, 300) }, { status: 502 });
    }
    const states = await res.json();

    const domains = ['sensor', 'binary_sensor', 'switch', 'number', 'select'];
    const sensors = (Array.isArray(states) ? states : [])
      .filter((s) => {
        const entityId = s.entity_id || '';
        const domain = entityId.split('.')[0];
        return entityId.toLowerCase().includes('solix') && domains.includes(domain);
      })
      .slice(0, 200)
      .map((s) => ({
        entity_id: s.entity_id,
        name: (s.attributes && s.attributes.friendly_name) || s.entity_id,
        state: s.state,
        unit: (s.attributes && s.attributes.unit_of_measurement) || '',
      }));

    return Response.json({ source: 'home_assistant', sensors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}