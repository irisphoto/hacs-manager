// Shared helpers for Home Assistant push data

export const DOMAINS = ['sensor', 'binary_sensor', 'switch', 'button', 'number', 'select', 'input_boolean', 'script'];

export const MAPPED_FIELDS = ['ha_soc_entity', 'ha_power_entity', 'ha_grid_entity', 'ha_home_entity', 'ha_car_entity'];

export const SERVICES = {
  switch: 'switch.turn_on',
  button: 'button.press',
  script: 'script.turn_on',
  input_boolean: 'input_boolean.turn_on',
  automation: 'automation.trigger',
};

export const cleanStr = (v, max = 255) => (v == null ? '' : String(v)).slice(0, max);

export const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export const solixText = (e) => `${e.entity_id} ${e.friendly_name || ''}`.toLowerCase();

export const isSolix = (e) => /solix|anker|x1_h_/.test(solixText(e));

export const isSupportedDomain = (e) => DOMAINS.includes((e.entity_id || '').split('.')[0]);

export const listAllSnapshots = async (client, maxPages = 10) => {
  const all = [];
  let last = '';
  for (let i = 0; i < maxPages; i++) {
    const batch = await client.entities.HaStateSnapshot.filter(
      last ? { entity_id: { $gt: last } } : {},
      'entity_id',
      500
    );
    if (!Array.isArray(batch)) break;
    all.push(...batch);
    if (batch.length < 500) break;
    last = batch[batch.length - 1].entity_id;
  }
  return all;
};

export const findSolixMapping = (snapshots) => {
  const solix = snapshots.filter(isSolix);
  // ignore daily-total / energy counters (kWh) — we want live power sensors
  const usable = solix.filter((e) => !/daily|_kwh|battery_energy/.test(solixText(e)));
  const first = (patterns, exclude = []) => {
    for (const p of patterns) {
      const hit = usable.find((e) => {
        const t = solixText(e);
        return t.includes(p) && !exclude.some((x) => t.includes(x));
      });
      if (hit) return hit;
    }
    return undefined;
  };
  return {
    ha_soc_entity: first(['state_of_charge', 'soc', 'battery_level']),
    ha_power_entity: first(['discharge_power', 'generated_battery_power'], []) || first(['power'], ['grid', 'meter', 'home', 'load', 'consumption', 'car', 'ev', 'charger', 'vehicle', 'charge']),
    ha_status_entity: first(['grid_status', 'station_role', 'status', 'operating', 'mode']),
    ha_grid_entity: first(['grid_import', 'grid_power', 'grid'], ['car', 'ev', 'charger', 'export']),
    ha_home_entity: first(['home_demand', 'home_load', 'home']),
    ha_car_entity: first(['ev_charging_power', 'car', 'ev', 'charger', 'vehicle']),
  };
};

export const buildDevicePatch = (device, stateMap) => {
  const patch = {};
  const stateOf = (field) => {
    const id = device[field];
    return id ? stateMap.get(id) : undefined;
  };

  const soc = stateOf('ha_soc_entity');
  if (soc) {
    const v = parseFloat(soc.state);
    if (!isNaN(v)) patch.soc = Math.max(0, Math.min(100, Math.round(v)));
  }
  const power = stateOf('ha_power_entity');
  if (power) {
    const v = parseFloat(power.state);
    if (!isNaN(v)) patch.power_kw = Math.round(v * 10) / 10;
  }
  const status = stateOf('ha_status_entity');
  if (status) {
    const raw = String(status.state || '').toLowerCase();
    if (raw.includes('discharg')) patch.status = 'discharging';
    else if (raw.includes('charg')) patch.status = 'charging';
    else if (raw.includes('offline') || raw.includes('unavail')) patch.status = 'offline';
    else patch.status = 'idle';
  }
  // a positive power reading means the battery is discharging right now
  if (patch.power_kw > 0 && patch.status === 'idle') patch.status = 'discharging';
  return patch;
};