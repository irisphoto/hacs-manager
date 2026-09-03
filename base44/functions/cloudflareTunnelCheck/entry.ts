import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const CF_API = 'https://api.cloudflare.com/client/v4';

async function call(path) {
  const res = await fetch(`${CF_API}${path}`, {
    headers: {
      Authorization: `Bearer ${(secrets.get('CLOUDFLARE_API_TOKEN') || '').trim()}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && data.success !== false, data };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const rawToken = secrets.get('CLOUDFLARE_API_TOKEN');
    if (!rawToken) return Response.json({ error: 'CLOUDFLARE_API_TOKEN is not set' }, { status: 500 });
    const token = rawToken.trim();
    const tokenShape = {
      length: token.length,
      hasWhitespaceInside: /\s/.test(token),
      hasQuotes: /["']/.test(token),
      isAlnumSafe: /^[A-Za-z0-9_-]+$/.test(token),
    };

    // 1. verify token
    const verify = await call('/user/tokens/verify');
    if (!verify.ok) {
      return Response.json({ connected: false, step: 'verify', status: verify.status, tokenShape, errors: verify.data.errors || [] }, { status: 200 });
    }

    // 2. accounts
    const accounts = await call('/accounts');
    const accountList = accounts.ok ? (accounts.data.result || []) : [];
    if (accountList.length === 0) {
      return Response.json({ connected: false, step: 'accounts', status: accounts.status, errors: accounts.data.errors || [] }, { status: 200 });
    }

    // 3. zones
    const zones = await call('/zones?per_page=50');
    const zoneList = zones.ok ? (zones.data.result || []).map((z) => ({ id: z.id, name: z.name, status: z.status, paused: z.paused })) : [];

    // 4. tunnels per account + their ingress rules
    const tunnels = [];
    for (const account of accountList) {
      const t = await call(`/accounts/${account.id}/cfd_tunnel?is_deleted=false`);
      if (!t.ok) continue;
      for (const tunnel of t.data.result || []) {
        const config = await call(`/accounts/${account.id}/cfd_tunnel/${tunnel.id}/configurations`);
        const ingress = config.ok ? (config.data.result && config.data.result.ingress) || [] : null;
        tunnels.push({
          id: tunnel.id,
          name: tunnel.name,
          status: tunnel.status,
          connections: (tunnel.connections || []).length,
          ingress,
          ingressError: config.ok ? null : config.data.errors || config.status,
        });
      }
    }

    // 5. compare HA host against tunnel ingress
    let haUrlHost = null;
    try { haUrlHost = new URL(secrets.get('HA_BASE_URL')).hostname; } catch (e) {}
    const haTunnel = haUrlHost ? tunnels.find((t) => (t.ingress || []).some((r) => r.hostname === haUrlHost)) : null;
    const zoneForHa = haUrlHost ? zoneList.find((z) => haUrlHost === z.name || haUrlHost.endsWith(`.${z.name}`)) : null;

    return Response.json({
      connected: true,
      tokenStatus: verify.data.result && verify.data.result.status,
      accounts: accountList.map((a) => ({ id: a.id, name: a.name })),
      zones: zoneList,
      tunnels,
      haUrlHost,
      haTunnelName: haTunnel ? haTunnel.name : null,
      haZone: zoneForHa ? { id: zoneForHa.id, name: zoneForHa.name, status: zoneForHa.status } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}