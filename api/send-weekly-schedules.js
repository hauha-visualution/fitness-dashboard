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

const weekdayLabel = (dateKey) => {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const day = date.getUTCDay();
  return day === 0 ? 'Chủ nhật' : `Thứ ${day + 1}`;
};

const compactWeekdays = (dateKeys) => {
  const labels = dateKeys.map(weekdayLabel);
  if (labels.length <= 1) return labels[0] || '';

  const first = labels[0];
  const remaining = labels.slice(1).map((label) => label.replace('Thứ ', ''));
  return `${first}, ${remaining.join(', ')}`;
};

const formatWeeklySchedule = (rows) => {
  const slots = new Map();
  rows.forEach((row) => {
    const time = row.scheduled_time.slice(0, 5);
    const dates = slots.get(time) || [];
    dates.push(row.scheduled_date);
    slots.set(time, dates);
  });

  return Array.from(slots.entries())
    .map(([time, dates]) => `${compactWeekdays(dates)} lúc ${time}`)
    .join(' · ');
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
    const payload = await response.json().catch(() => ({}));
    const sent = response.ok ? (payload.sent || 0) : 0;

    if (sent > 0) {
      await restFetch(`notifications?id=eq.${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...(notification.metadata || {}),
            pushSentAt: new Date().toISOString(),
            pushResult: { sent, failed: payload.failed || 0 },
          },
        }),
      });
    }

    return { sent, failed: payload.failed || 0 };
  } catch {
    return { sent: 0, failed: 0 };
  }
};

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

  const existingResponse = await restFetch('notifications?select=id,recipient_user_id,type,title,body,metadata&type=eq.weekly_schedule&order=created_at.desc&limit=1000');
  const existingByRecipient = new Map();
  if (existingResponse.ok) for (const item of await existingResponse.json()) {
    if (item.metadata?.weekStart === start && !existingByRecipient.has(item.recipient_user_id)) {
      existingByRecipient.set(item.recipient_user_id, item);
    }
  }

  let created = 0;
  let pushSent = 0;
  for (const [recipient_user_id, rows] of grouped) {
    const existing = existingByRecipient.get(recipient_user_id);
    if (existing) {
      if (!existing.metadata?.pushSentAt) {
        const result = await sendPush(existing);
        pushSent += result.sent;
      }
      continue;
    }
    const scheduleSummary = formatWeeklySchedule(rows);
    const sessionCount = rows.length;
    const insert = await restFetch('notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ recipient_user_id, type: 'weekly_schedule', title: `Lịch tập tuần sau (${start.slice(8, 10)}/${start.slice(5, 7)} - ${end.slice(8, 10)}/${end.slice(5, 7)}):`, body: `Bạn có ${sessionCount} buổi tập vào ${scheduleSummary}. 💪`, metadata: { url: '/portal?tab=sessions', targetTab: 'sessions', weekStart: start, weekEnd: end } }),
    });
    if (!insert.ok) continue;
    const notification = (await insert.json())[0];
    const result = await sendPush(notification);
    pushSent += result.sent;
    created += 1;
  }
  const result = { ok: true, weekStart: start, weekEnd: end, created, pushSent };
  console.info('[weekly-schedule]', result);
  return json(res, 200, result);
}
