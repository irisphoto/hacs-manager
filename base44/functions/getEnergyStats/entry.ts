import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const HOUR_MS = 3600 * 1000;
const round1 = (v) => Math.round(v * 10) / 10;

// last known value at or before time t (binary search)
const valueAt = (arr, t) => {
  if (!arr || arr.length === 0) return null;
  let lo = 0;
  let hi = arr.length - 1;
  let ans = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid].t <= t) { ans = arr[mid].v; lo = mid + 1; } else { hi = mid - 1; }
  }
  return ans;
};

// build hourly (24h), daily (7d) aggregates and battery health from 7 days of hourly buckets
const aggregate = (buckets, device) => {
  const hourly = buckets.slice(-24).map((b) => ({
    time: new Date(b.t).toISOString(),
    soc: b.soc,
    battery_kw: b.battery_kw,
    grid_kw: b.grid_kw,
    home_kw: b.home_kw,
    car_kw: b.car_kw,
  }));

  const byDay = {};
  for (const b of buckets) {
    const day = new Date(b.t).toISOString().slice(0, 10);
    if (!byDay[day]) {
      byDay[day] = { date: day, home_kwh: 0, car_kwh: 0, grid_kwh: 0, battery_charge_kwh: 0, battery_discharge_kwh: 0 };
    }
    byDay[day].home_kwh += Math.max(0, b.home_kw);
    byDay[day].car_kwh += Math.max(0, b.car_kw);
    byDay[day].grid_kwh += Math.max(0, b.grid_kw);
    if (b.battery_kw > 0) byDay[day].battery_discharge_kwh += b.battery_kw;
    else byDay[day].battery_charge_kwh += -b.battery_kw;
  }
  const daily = Object.values(byDay).map((d) => ({
    date: d.date,
    home_kwh: round1(d.home_kwh),
    car_kwh: round1(d.car_kwh),
    grid_kwh: round1(d.grid_kwh),
    battery_charge_kwh: round1(d.battery_charge_kwh),
    battery_discharge_kwh: round1(d.battery_discharge_kwh),
  }));

  const throughput = round1(daily.reduce((s, d) => s + d.battery_charge_kwh + d.battery_discharge_kwh, 0));
  const last = buckets[buckets.length - 1] || {};

  return {
    hourly,
    daily,
    health: {
      soc: last.soc == null ? (device.soc ?? 0) : last.soc,
      status: device.status || 'idle',
      capacity_kwh: device.capacity_kwh || 0,
      throughput_kwh: throughput,
    },
  };
};

// realistic 7-day demo data when Home Assistant is not available
const demoBuckets = () => {
  const nowHour = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
  const buckets = [];
  let soc = 78;
  for (let i = 167; i >= 0; i--) {
    const t = nowHour - i * HOUR_MS;
    const h = new Date(t).getUTCHours();
    const day = new Date(t).getUTCDay();
    let home = 0.25 + 0.15 * Math.abs(Math.sin(h * 1.7 + i));
    if (h >= 6 && h <= 8) home += 0.9;
    if (h >= 17 && h <= 21) home += 1.1;
    const car = (h >= 1 && h <= 4 && day % 2 === 1) ? 3.5 : 0;
    let batt = 0;
    if (h >= 10 && h <= 14) batt = -(0.9 + 0.3 * Math.abs(Math.sin(h)));
    if (h >= 17 && h <= 21) batt = 1.2 + 0.2 * Math.abs(Math.cos(h));
    const grid = Math.max(0, home + car - Math.max(0, batt) + Math.max(0, -batt));
    soc = Math.min(100, Math.max(15, soc - batt * 0.9));
    buckets.push({ t, soc: Math.round(soc), battery_kw: round1(batt), grid_kw: round1(grid), home_kw: round1(home), car_kw: round1(car) });
  }
  return buckets;
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.device_id) return Response.json({ error: 'device_id is required' }, { status: 400 });
    const device = await base44.entities.SolixDevice.get(body.device_id);
    if (!device) return Response.json({ error: 'Device not found' }, { status: 404 });

    const baseUrl = (secrets.get('HA_BASE_URL') || '').replace(/\/+$/, '');
    const token = secrets.get('HA_TOKEN');
    const entities = {
      soc: device.ha_soc_entity,
      battery: device.ha_power_entity,
      grid: device.ha_grid_entity,
      home: device.ha_home_entity,
      car: device.ha_car_entity,
    };
    const configured = Object.values(entities).filter(Boolean);

    if (!baseUrl || !token || configured.length === 0) {
      return Response.json({ source: 'demo', ...aggregate(demoBuckets(), device) });
    }

    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * HOUR_MS);
    const url = `${baseUrl}/api/history/period/${start.toISOString()}` +
      `?end_time=${encodeURIComponent(end.toISOString())}` +
      `&filter_entity_id=${configured.map(encodeURIComponent).join(',')}` +
      `&minimal_response=1&significant_changes_only=1`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return Response.json({ source: 'demo', ...aggregate(demoBuckets(), device) });
    const history = await res.json();

    const series = {};
    for (const entityHistory of history) {
      if (!Array.isArray(entityHistory) || entityHistory.length === 0) continue;
      const entityId = entityHistory[0].entity_id;
      const points = [];
      for (const s of entityHistory) {
        const v = parseFloat(s.state);
        if (isNaN(v)) continue;
        const ts = new Date(s.last_updated || s.last_changed).getTime();
        if (isNaN(ts)) continue;
        points.push({ t: ts, v });
      }
      points.sort((a, b) => a.t - b.t);
      series[entityId] = points;
    }

    const nowHour = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    const buckets = [];
    for (let i = 167; i >= 0; i--) {
      const t = nowHour - i * HOUR_MS;
      const probe = t + HOUR_MS - 1;
      const socV = valueAt(series[entities.soc], probe);
      const battV = valueAt(series[entities.battery], probe);
      const gridV = valueAt(series[entities.grid], probe);
      const homeV = valueAt(series[entities.home], probe);
      const carV = valueAt(series[entities.car], probe);
      buckets.push({
        t,
        soc: socV == null ? null : Math.round(socV),
        battery_kw: battV == null ? 0 : round1(battV),
        grid_kw: gridV == null ? 0 : round1(gridV),
        home_kw: homeV == null ? 0 : round1(homeV),
        car_kw: carV == null ? 0 : round1(carV),
      });
    }

    const hasData = buckets.some((b) => b.soc != null || b.battery_kw || b.grid_kw || b.home_kw || b.car_kw);
    if (!hasData) return Response.json({ source: 'demo', ...aggregate(demoBuckets(), device) });

    return Response.json({ source: 'home_assistant', ...aggregate(buckets, device) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}