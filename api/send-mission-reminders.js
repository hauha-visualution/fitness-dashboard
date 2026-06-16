/* global process */

const normalizeSupabaseUrl = (url = '') =>
  url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

const json = (res, status, body) => {
  res.status(status).json(body);
};

const todayKey = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
};

const formatDate = (value) => {
  if (!value) return '--';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const missionQuantityLabel = (mission) => `${mission?.duration_minutes ?? '--'} ${mission?.duration_unit || 'phút'}`;

const restFetch = (path, options = {}) => fetch(`${supabaseUrl}/rest/v1/${path}`, {
  ...options,
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...(options.headers || {}),
  },
});

const sendPush = async (notification) => {
  const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ record: notification }),
  });

  let pushResult = null;
  try {
    pushResult = JSON.parse(await pushResponse.text());
  } catch {
    pushResult = null;
  }

  if (pushResponse.ok && (pushResult?.sent ?? 0) > 0) {
    await restFetch(`notifications?id=eq.${notification.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: {
          ...(notification.metadata || {}),
          pushSentAt: new Date().toISOString(),
          pushResult: {
            sent: pushResult.sent,
            failed: pushResult.failed ?? 0,
          },
        },
      }),
    }).catch(() => null);
  }

  return {
    ok: pushResponse.ok,
    sent: pushResult?.sent ?? 0,
    failed: pushResult?.failed ?? 0,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    json(res, 500, { ok: false, error: 'Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.' });
    return;
  }

  const expectedTokens = [serviceRoleKey, cronSecret].filter(Boolean).map((token) => `Bearer ${token}`);
  if (!expectedTokens.includes(req.headers.authorization)) {
    json(res, 401, { ok: false, error: 'Unauthorized' });
    return;
  }

  const runDate = String(req.query?.date || todayKey());
  const response = await restFetch(
    `missions?select=id,client_id,title,duration_minutes,duration_unit,perform_time,start_date,end_date,status,last_reminded_on&status=neq.completed&start_date=lte.${runDate}&end_date=gte.${runDate}&order=perform_time.asc`
  );

  if (!response.ok) {
    json(res, 502, {
      ok: false,
      error: 'Failed to fetch missions.',
      status: response.status,
      body: (await response.text()).slice(0, 500),
    });
    return;
  }

  const missions = (await response.json()).filter((mission) => mission.last_reminded_on !== runDate);
  const clientIds = Array.from(new Set(missions.map((mission) => mission.client_id).filter(Boolean)));
  const clientsById = {};

  if (clientIds.length > 0) {
    const clientsResponse = await restFetch(`clients?select=id,auth_user_id&id=in.(${clientIds.join(',')})`);
    if (clientsResponse.ok) {
      (await clientsResponse.json()).forEach((client) => {
        clientsById[client.id] = client;
      });
    }
  }

  const results = [];

  for (const mission of missions) {
    const client = clientsById[mission.client_id];
    if (!client?.auth_user_id) {
      results.push({ missionId: mission.id, skipped: true, reason: 'missing_client_auth_user_id' });
      continue;
    }

    const timeLabel = mission.perform_time ? ` lúc ${mission.perform_time.slice(0, 5)}` : '';
    const notificationPayload = {
      recipient_user_id: client.auth_user_id,
      type: 'mission_reminder',
      title: 'Nhắc mission hôm nay',
      body: `${mission.title} vẫn chưa done. Hãy hoàn thành ${missionQuantityLabel(mission)}${timeLabel} trước ${formatDate(mission.end_date)} nhé.`,
      metadata: {
        url: '/portal?tab=missions',
        targetTab: 'missions',
        missionId: mission.id,
      },
    };

    const insertResponse = await restFetch('notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(notificationPayload),
    });

    if (!insertResponse.ok) {
      results.push({
        missionId: mission.id,
        notificationOk: false,
        details: (await insertResponse.text()).slice(0, 300),
      });
      continue;
    }

    const notification = (await insertResponse.json())[0];
    const push = await sendPush(notification);

    await restFetch(`missions?id=eq.${mission.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_reminded_on: runDate, updated_at: new Date().toISOString() }),
    });

    results.push({
      missionId: mission.id,
      notificationId: notification.id,
      push,
    });
  }

  json(res, 200, {
    ok: true,
    date: runDate,
    checked: missions.length,
    reminded: results.filter((result) => result.notificationId).length,
    results,
  });
}
