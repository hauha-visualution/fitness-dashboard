import fs from 'node:fs/promises';
import path from 'node:path';

const TABLES = [
  'coaches',
  'clients',
  'packages',
  'sessions',
  'payments',
  'workout_templates',
  'template_exercises',
  'template_assignments',
  'nutrition_checkins',
  'survey_responses',
  'inbody_records',
  'notifications',
  'push_subscriptions',
];

const env = await loadEnv();
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Run with SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard > Project Settings > API.');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.resolve('backups', `supabase-${stamp}`);
await fs.mkdir(backupDir, { recursive: true });

const manifest = {
  createdAt: new Date().toISOString(),
  supabaseUrl,
  tables: {},
};

for (const table of TABLES) {
  try {
    const rows = await fetchAllRows(table);
    await fs.writeFile(path.join(backupDir, `${table}.json`), `${JSON.stringify(rows, null, 2)}\n`);
    await fs.writeFile(path.join(backupDir, `${table}.csv`), toCsv(rows));
    manifest.tables[table] = { ok: true, rows: rows.length };
    console.log(`Backed up ${table}: ${rows.length} rows`);
  } catch (error) {
    manifest.tables[table] = { ok: false, error: error.message };
    console.warn(`Skipped ${table}: ${error.message}`);
  }
}

await fs.writeFile(path.join(backupDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Backup saved to ${backupDir}`);

async function fetchAllRows(table) {
  const pageSize = 1000;
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
    url.searchParams.set('select', '*');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(pageSize));

    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${(await response.text()).slice(0, 200)}`);
    }

    const page = await response.json();
    rows.push(...page);

    if (page.length < pageSize) return rows;
  }
}

async function loadEnv() {
  const parsed = {};
  for (const file of ['.env.local', '.env']) {
    try {
      const contents = await fs.readFile(file, 'utf8');
      for (const line of contents.split('\n')) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
        if (!match) continue;
        parsed[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      }
    } catch {
      // Optional env files.
    }
  }
  return { ...parsed, ...process.env };
}

function toCsv(rows) {
  if (rows.length === 0) return '';
  const columns = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));

  const lines = [columns.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsv(row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function escapeCsv(value) {
  if (value == null) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
