/* global process */

const normalizeSupabaseUrl = (url = '') => url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;
const json = (res, status, body) => res.status(status).json(body);

const vnDate = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const nextWeekRange = () => {
  const today = new Date(`${vnDate(new Date())}T00:00:00Z`);
  const day = today.getUTCDay();
  const untilMonday = day === 0 ? 1 : 8 - day;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + untilMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
};

const restFetch = (path, options = {}) => fetch(`${supabaseUrl}/rest/v1/${path}`, {
  ...options,
  headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, ...(options.headers || {}) },
});

const sendPush = (notification) => fetch(`${supabaseUrl}/functions/v1/send-push`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ record: notification }),
}).catch(() => null);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!supabaseUrl || !serviceRoleKey) return json(res, 500, { ok: false, error: 'Missing Supabase configuration.' });
  const tokens = [serviceRoleKey, cronSecret].filter(Boolean).map((token) => `Bearer ${token}`);
  if (!tokens.includes(req.headers.authorization)) return json(res, 401, { ok: false, error: 'Unauthorized' });

  const { start, end } = nextWeekRange();
  const sessionsResponse = await restFetch(`sessions?select=client_id,scheduled_date,scheduled_time,status,clients!inner(auth_user_id)&status=in.(scheduled,in_progress)&scheduled_date=gte.${start}&scheduled_date=lte.${end}&order=scheduled_date.asc,scheduled_time.asc`);
  if (!sessionsResponse.ok) return json(res, 502, { ok: false, error: 'Could not load next-week sessions.' });
  const grouped = new Map();
  for (const row of await sessionsResponse.json()) {
    const authUserId = row.clients?.auth_user_id;
    if (!authUserId) continue;
    const list = grouped.get(authUserId) || [];
    list.push(row);
    grouped.set(authUserId, list);
  }

  const existingResponse = await restFetch('notifications?select=recipient_user_id,metadata&type=eq.weekly_schedule&order=created_at.desc&limit=1000');
  const alreadySent = new Set();
  if (existingResponse.ok) for (const item of await existingResponse.json()) {
    if (item.metadata?.weekStart === start) alreadySent.add(item.recipient_user_id);
  }

  let sent = 0;
  for (const [recipient_user_id, rows] of grouped) {
    if (alreadySent.has(recipient_user_id)) continue;
    const agenda = rows.map((row) => `${row.scheduled_date.split('-').reverse().slice(0, 2).join('/')} ${row.scheduled_time.slice(0, 5)}`).join(' · ');
    const insert = await restFetch('notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ recipient_user_id, type: 'weekly_schedule', title: 'Lịch tập tuần tới 📅', body: `Lịch tập tuần ${start.split('-').reverse().slice(0, 2).join('/')} của bạn: ${agenda}.`, metadata: { url: '/portal?tab=sessions', targetTab: 'sessions', weekStart: start, weekEnd: end } }),
    });
    if (!insert.ok) continue;
    const notification = (await insert.json())[0];
    void sendPush(notification);
    sent += 1;
  }
  return json(res, 200, { ok: true, weekStart: start, weekEnd: end, sent });
}
