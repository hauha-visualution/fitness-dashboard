/* global process */

const normalizeSupabaseUrl = (url = '') => url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + (day === 0 ? 1 : 8 - day));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
};

const currentWeekRemainingRange = () => {
  const today = new Date(`${vnDate(new Date())}T00:00:00Z`);
  const day = today.getUTCDay();
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(today);
  sunday.setUTCDate(today.getUTCDate() + (day === 0 ? 0 : 7 - day));
  return {
    start: today.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    weekStart: monday.toISOString().slice(0, 10),
  };
};

const weekdayLabel = (dateKey) => {
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  return day === 0 ? 'Chủ nhật' : `Thứ ${day + 1}`;
};

const formatWeeklySchedule = (rows) => {
  const slots = new Map();
  rows.forEach((row) => {
    const time = row.scheduled_time.slice(0, 5);
    slots.set(time, [...(slots.get(time) || []), row.scheduled_date]);
  });
  return Array.from(slots.entries()).map(([time, dates]) => {
    const labels = dates.map(weekdayLabel);
    const days = labels.length <= 1 ? labels[0] : `${labels[0]}, ${labels.slice(1).map((label) => label.replace('Thứ ', '')).join(', ')}`;
    return `${days} lúc ${time}`;
  }).join(' · ');
};

const restFetch = (path, options = {}) => fetch(`${supabaseUrl}/rest/v1/${path}`, {
  ...options,
  headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, ...(options.headers || {}) },
});

const sendPush = async (notification) => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ record: notification }),
    });
    const result = await response.json().catch(() => ({}));
    const sent = response.ok ? (result.sent || 0) : 0;
    if (sent > 0) {
      await restFetch(`notifications?id=eq.${notification.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { ...(notification.metadata || {}), pushSentAt: new Date().toISOString(), pushResult: { sent, failed: result.failed || 0 } } }),
      });
    }
    return sent;
  } catch {
    return 0;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return json(res, 500, { ok: false, error: 'Missing Supabase configuration.' });

  const accessToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!accessToken) return json(res, 401, { ok: false, error: 'Missing authentication.' });
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` } });
  if (!userResponse.ok) return json(res, 401, { ok: false, error: 'Invalid authentication.' });
  const coach = await userResponse.json();
  if (!coach.email) return json(res, 403, { ok: false, error: 'Coach email not found.' });
  const payload = typeof req.body === 'object' && req.body ? req.body : {};
  const period = payload.period === 'current' ? 'current' : 'next';

  const clientsResponse = await restFetch(`clients?select=id,auth_user_id&coach_email=eq.${encodeURIComponent(coach.email)}`);
  if (!clientsResponse.ok) return json(res, 502, { ok: false, error: 'Could not load trainees.' });
  const clients = (await clientsResponse.json()).filter((client) => client.auth_user_id);
  const clientIds = clients.map((client) => client.id);
  if (clientIds.length === 0) return json(res, 200, { ok: true, created: 0, pushSent: 0, reason: 'No linked trainees.' });

  const range = period === 'current' ? currentWeekRemainingRange() : nextWeekRange();
  const { start, end } = range;
  const weekStart = range.weekStart || start;
  const sessionsResponse = await restFetch(`sessions?select=client_id,scheduled_date,scheduled_time&status=in.(scheduled,in_progress)&client_id=in.(${clientIds.join(',')})&scheduled_date=gte.${start}&scheduled_date=lte.${end}&order=scheduled_date.asc,scheduled_time.asc`);
  if (!sessionsResponse.ok) return json(res, 502, { ok: false, error: 'Could not load next-week sessions.' });
  const authUserIdByClientId = new Map(clients.map((client) => [client.id, client.auth_user_id]));
  const grouped = new Map();
  for (const row of await sessionsResponse.json()) {
    const recipient = authUserIdByClientId.get(row.client_id);
    if (recipient) grouped.set(recipient, [...(grouped.get(recipient) || []), row]);
  }

  const existingResponse = await restFetch('notifications?select=recipient_user_id,metadata&type=eq.weekly_schedule&order=created_at.desc&limit=1000');
  const alreadyNotified = new Set();
  if (existingResponse.ok) for (const item of await existingResponse.json()) {
    if (item.metadata?.weekStart === weekStart) alreadyNotified.add(item.recipient_user_id);
  }

  let created = 0;
  let pushSent = 0;
  for (const [recipient_user_id, rows] of grouped) {
    if (alreadyNotified.has(recipient_user_id)) continue;
    const insert = await restFetch('notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        recipient_user_id,
        type: 'weekly_schedule',
        title: `Lịch tập ${period === 'current' ? 'tuần này' : 'tuần sau'} (${start.slice(8, 10)}/${start.slice(5, 7)} - ${end.slice(8, 10)}/${end.slice(5, 7)}):`,
        body: period === 'current'
          ? `Bạn còn ${rows.length} buổi tập từ hôm nay vào ${formatWeeklySchedule(rows)}. 💪`
          : `Bạn có ${rows.length} buổi tập vào ${formatWeeklySchedule(rows)}. 💪`,
        metadata: { url: '/portal?tab=sessions', targetTab: 'sessions', weekStart, weekEnd: end, sentManuallyByCoach: true, schedulePeriod: period },
      }),
    });
    if (!insert.ok) continue;
    const notification = (await insert.json())[0];
    pushSent += await sendPush(notification);
    created += 1;
  }

  return json(res, 200, { ok: true, period, start, end, weekStart, created, pushSent });
}
