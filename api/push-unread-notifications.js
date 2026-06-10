/* global process */

const normalizeSupabaseUrl = (url = '') =>
  url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const json = (res, status, body) => {
  res.status(status).json(body);
};

const hasPushMarker = (notification) => Boolean(notification?.metadata?.pushSentAt);

const parsePushResult = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const markPushed = async (notification, pushResult) => {
  const nextMetadata = {
    ...(notification.metadata || {}),
    pushSentAt: new Date().toISOString(),
    pushResult: {
      sent: pushResult.sent,
      failed: pushResult.failed ?? 0,
    },
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${notification.id}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metadata: nextMetadata }),
  });

  return response.ok;
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

  if (req.headers.authorization !== `Bearer ${serviceRoleKey}`) {
    json(res, 401, { ok: false, error: 'Unauthorized' });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query?.limit || 25), 1), 100);
  const response = await fetch(
    `${supabaseUrl}/rest/v1/notifications?select=*&is_read=eq.false&order=created_at.asc&limit=${limit}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );

  if (!response.ok) {
    json(res, 502, {
      ok: false,
      error: 'Failed to fetch unread notifications.',
      status: response.status,
      body: (await response.text()).slice(0, 500),
    });
    return;
  }

  const unread = await response.json();
  const pending = unread.filter((notification) => !hasPushMarker(notification));
  const results = [];

  for (const notification of pending) {
    const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ record: notification }),
    });

    const pushText = await pushResponse.text();
    const pushResult = parsePushResult(pushText);
    const sent = pushResponse.ok ? (pushResult?.sent ?? 0) : 0;
    const marked = sent > 0 ? await markPushed(notification, pushResult) : false;

    results.push({
      id: notification.id,
      recipientUserId: notification.recipient_user_id,
      pushOk: pushResponse.ok,
      pushStatus: pushResponse.status,
      sent,
      failed: pushResult?.failed ?? 0,
      marked,
    });
  }

  json(res, 200, {
    ok: true,
    checked: unread.length,
    pending: pending.length,
    pushed: results.filter((result) => result.sent > 0).length,
    results,
  });
}
