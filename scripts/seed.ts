/**
 * Seed 500 synthetic reports with realistically clustered coordinates.
 *
 *     npx tsx scripts/seed.ts            # seed on top of whatever is there
 *     npx tsx scripts/seed.ts --reset    # wipe reports/incidents first
 *
 * Owner: B (backend). PRD §11 calls this the day-1 deliverable, and decisions/002
 * makes it the critical path: nobody can build or test clustering, ranking, maps
 * or the admin queue against an empty table, and "empty-database demo" is on the
 * PRD's own risk list.
 *
 * Requires .env.local with:
 *     NEXT_PUBLIC_SUPABASE_URL=...
 *     SUPABASE_SERVICE_ROLE_KEY=...     # service role: this bypasses RLS by design
 *
 * The service role key is a full-access credential. It belongs in .env.local
 * (gitignored) and in Vercel's env settings. Never in NEXT_PUBLIC_*, never in a
 * client component, never committed.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CATEGORIES,
  CATEGORY_SEVERITY_SEED,
  CLUSTER_BASE_RADIUS_M,
  type Category,
  type SeveritySelf,
} from '../lib/contracts/enums';

/* ── config ───────────────────────────────────────────────────────────────── */

const REPORT_COUNT = 500;
const CITIZEN_COUNT = 120;

/**
 * Demo city. Keep this in step with CITY in mocks/fixtures.ts, or the mock map
 * and the seeded map show two different cities and the demo looks broken.
 */
const CITY = { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 };

/**
 * Hotspots are the whole point of this script. Reports scattered uniformly over
 * a city produce 500 incidents of one report each — clustering looks broken,
 * the priority engine has nothing to rank, and the "N others reported this"
 * message never fires. Real civic reports concentrate: a bad junction, a
 * flooding underpass, one unlit stretch of road.
 */
const HOTSPOTS = [
  { name: 'Ashram Road junction',   lat: 23.0339, lng: 72.5610, weight: 9 },
  { name: 'CG Road',                lat: 23.0295, lng: 72.5610, weight: 8 },
  { name: 'SG Highway underpass',   lat: 23.0405, lng: 72.5100, weight: 7 },
  { name: 'Maninagar station',      lat: 22.9960, lng: 72.6020, weight: 6 },
  { name: 'Vastrapur lake',         lat: 23.0370, lng: 72.5290, weight: 5 },
  { name: 'Bopal circle',           lat: 23.0300, lng: 72.4700, weight: 4 },
  { name: 'Paldi cross road',       lat: 23.0110, lng: 72.5620, weight: 4 },
  { name: 'Naranpura char rasta',   lat: 23.0560, lng: 72.5560, weight: 3 },
];

const WARDS = [
  { name: 'Navrangpura', lat: 23.0350, lng: 72.5600 },
  { name: 'Paldi',       lat: 23.0100, lng: 72.5650 },
  { name: 'Maninagar',   lat: 22.9950, lng: 72.6000 },
  { name: 'Bopal',       lat: 23.0300, lng: 72.4700 },
  { name: 'Naranpura',   lat: 23.0560, lng: 72.5550 },
  { name: 'Vastrapur',   lat: 23.0370, lng: 72.5300 },
];

const NOTES = [
  'Been like this for weeks now.',
  'Dangerous after dark, please fix.',
  'Water collects here every time it rains.',
  'Two-wheelers keep skidding at this spot.',
  'Complained last month, nothing happened.',
  'Right outside the school gate.',
  'Getting worse after the rain.',
  'Whole street is affected.',
];

/* ── deterministic RNG ────────────────────────────────────────────────────── */
// Fixed seed: the same demo database every time, so a screenshot taken
// yesterday still matches what the judges see.

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260822);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));

function weightedHotspot() {
  const total = HOTSPOTS.reduce((n, h) => n + h.weight, 0);
  let r = rand() * total;
  for (const h of HOTSPOTS) {
    r -= h.weight;
    if (r <= 0) return h;
  }
  return HOTSPOTS[0];
}

function offsetMetres(lat: number, lng: number, dxM: number, dyM: number) {
  return {
    lat: lat + dyM / 111_000,
    lng: lng + dxM / (111_000 * Math.cos((lat * Math.PI) / 180)),
  };
}

/* ── env ──────────────────────────────────────────────────────────────────── */

function loadEnv() {
  // Deliberately not pulling in dotenv for one file at seed time.
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // No .env.local — fall through to the check below.
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      '\nMissing Supabase credentials.\n\n' +
        'Create .env.local in the repo root with:\n' +
        '  NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co\n' +
        '  SUPABASE_SERVICE_ROLE_KEY=<service role key>\n\n' +
        'Both are in the Supabase dashboard under Project Settings → API.\n',
    );
    process.exit(1);
  }
  return { url, key };
}

/* ── seed ─────────────────────────────────────────────────────────────────── */

async function main() {
  const { url, key } = loadEnv();
  const db = createClient(url, key, { auth: { persistSession: false } });
  const reset = process.argv.includes('--reset');

  if (reset) {
    console.log('resetting reports and incidents...');
    // Order matters: children first, and the FK from incidents to itself means
    // previous_incident_id has to be cleared before the rows can go.
    await db.from('report_verifications').delete().neq('report_id', '00000000-0000-0000-0000-000000000000');
    await db.from('status_history').delete().neq('id', 0);
    await db.from('incident_reporters').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    await db.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('incidents').update({ previous_incident_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    await db.from('incidents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  /* wards — 1km squares around each centre, enough for the heat map to bucket */
  console.log('seeding wards...');
  const wardIds: string[] = [];
  for (const w of WARDS) {
    const half = 900;
    const sw = offsetMetres(w.lat, w.lng, -half, -half);
    const ne = offsetMetres(w.lat, w.lng, half, half);
    const polygon =
      `POLYGON((${sw.lng} ${sw.lat}, ${ne.lng} ${sw.lat}, ` +
      `${ne.lng} ${ne.lat}, ${sw.lng} ${ne.lat}, ${sw.lng} ${sw.lat}))`;

    const { data, error } = await db
      .from('wards')
      .upsert({ name: w.name, geometry: polygon }, { onConflict: 'name' })
      .select('id')
      .single();
    if (error) throw new Error(`ward ${w.name}: ${error.message}`);
    wardIds.push(data.id);
  }

  /* citizens — created through auth so RLS and the FK to auth.users hold */
  console.log(`seeding ${CITIZEN_COUNT} citizens...`);
  const citizenIds: string[] = [];
  for (let i = 0; i < CITIZEN_COUNT; i++) {
    const email = `citizen${i}@seed.civicreport.local`;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: 'seed-only-not-a-real-account',
      email_confirm: true,
    });
    if (error) {
      if (!/already/i.test(error.message)) throw new Error(`citizen ${i}: ${error.message}`);
      const { data: existing } = await db.from('users').select('id').eq('phone', email).maybeSingle();
      if (existing) citizenIds.push(existing.id);
      continue;
    }
    citizenIds.push(data.user.id);
    await db.from('users').upsert({
      id: data.user.id,
      role: 'CITIZEN',
      full_name: `Seed Citizen ${i + 1}`,
      phone: email,
    });
  }
  if (citizenIds.length === 0) throw new Error('no citizens available to attribute reports to');

  /* reports — clustered around hotspots, then assigned to incidents */
  console.log(`seeding ${REPORT_COUNT} reports...`);
  let clustered = 0;
  let created = 0;

  for (let i = 0; i < REPORT_COUNT; i++) {
    // 80% land on a hotspot, 20% scatter. The scatter is what proves clustering
    // is discriminating rather than merging everything nearby.
    const onHotspot = rand() < 0.8;
    const base = onHotspot ? weightedHotspot() : { lat: CITY.lat, lng: CITY.lng };
    const spread = onHotspot ? 40 : 5000;
    const loc = offsetMetres(base.lat, base.lng, between(-spread, spread), between(-spread, spread));

    // Browser GPS in a city is genuinely this bad. Feeding the real distribution
    // in is the only way the adaptive radius gets tested before demo day.
    const accuracy = Math.round(between(5, 48));
    const category = pick(CATEGORIES) as Category;
    const userId = pick(citizenIds);
    const createdAt = new Date(Date.now() - between(0, 26) * 86_400_000).toISOString();

    // Seed-time clustering uses the same spatial primitive the engine will.
    // C owns the real algorithm in lib/engine; this exists so the seeded
    // database is internally consistent before that lands.
    const radius = CLUSTER_BASE_RADIUS_M + accuracy;
    const { data: match, error: matchErr } = await db.rpc('find_nearby_open_incident', {
      p_category: category,
      p_lat: loc.lat,
      p_lng: loc.lng,
      p_radius_m: radius,
    });
    if (matchErr) throw new Error(`clustering lookup: ${matchErr.message}`);

    let incidentId: string | undefined = match?.[0]?.incident_id;

    if (!incidentId) {
      // Nothing open nearby. Check whether this location has failed before —
      // that link is what turns a queue into infrastructure intelligence.
      const { data: previous } = await db.rpc('find_previous_closed_incident', {
        p_category: category,
        p_lat: loc.lat,
        p_lng: loc.lng,
        p_radius_m: radius * 2,
      });

      const { data: inc, error: incErr } = await db
        .from('incidents')
        .insert({
          category,
          centroid: `POINT(${loc.lng} ${loc.lat})`,
          status: 'SUBMITTED',
          first_reported_at: createdAt,
          previous_incident_id: previous ?? null,
          ward_id: pick(wardIds),
        })
        .select('id')
        .single();
      if (incErr) throw new Error(`incident insert: ${incErr.message}`);
      incidentId = inc.id;
      created++;
    } else {
      clustered++;
    }

    const { error: repErr } = await db.from('reports').insert({
      user_id: userId,
      incident_id: incidentId,
      category,
      photo_url: `seed/photos/${category.toLowerCase()}-${intBetween(1, 6)}.jpg`,
      location: `POINT(${loc.lng} ${loc.lat})`,
      gps_accuracy_m: accuracy,
      description: rand() < 0.6 ? pick(NOTES) : null,
      severity_self: pick(['MINOR', 'MODERATE', 'SEVERE'] as const) as SeveritySelf,
      device_fingerprint: `seed-device-${userId.slice(0, 8)}`,
      created_at: createdAt,
    });
    if (repErr) throw new Error(`report insert: ${repErr.message}`);

    // Unique-user counting. The primary key makes the second report from the
    // same person on the same incident a no-op, which is exactly the point.
    await db
      .from('incident_reporters')
      .upsert({ incident_id: incidentId, user_id: userId, first_at: createdAt },
              { onConflict: 'incident_id,user_id', ignoreDuplicates: true });

    await db.rpc('recompute_centroid', { p_incident_id: incidentId });

    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${REPORT_COUNT}`);
  }

  /* summary */
  const { count: incidentCount } = await db
    .from('incidents')
    .select('*', { count: 'exact', head: true });

  const ratio = incidentCount ? REPORT_COUNT / incidentCount : 0;

  console.log('\n─────────────────────────────────────');
  console.log(`reports           ${REPORT_COUNT}`);
  console.log(`incidents         ${incidentCount}`);
  console.log(`joined existing   ${clustered}`);
  console.log(`seeded new        ${created}`);
  console.log(`reports/incident  ${ratio.toFixed(2)}×`);
  console.log('─────────────────────────────────────');
  // PRD §13 targets >2.5x duplicate reduction. Below that the hotspots are too
  // spread out or the radius is too tight; above ~6x they are too tight and
  // distinct problems are being merged.
  if (ratio < 2.5) {
    console.warn('\n⚠ below the 2.5× duplicate-reduction target in PRD §13.');
    console.warn('  Tighten the hotspot spread or widen CLUSTER_BASE_RADIUS_M.');
  }
  console.log('\nPriority scores are all 0 until the rescoring cron runs.');
  console.log('That is correct — the score is never computed on read.\n');

  console.log('Severity table seeded from contracts:');
  for (const c of CATEGORIES) console.log(`  ${c.padEnd(15)} ${CATEGORY_SEVERITY_SEED[c]}`);
}

main().catch((err) => {
  console.error('\nseed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
