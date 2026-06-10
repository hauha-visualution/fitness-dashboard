/* global process */

const normalizeSupabaseUrl = (url = '') =>
  url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const json = (res, status, body) => {
  res.status(status).json(body);
};

const readBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
};

const addPushMarker = async (notification, pushResponse, pushText) => {
  if (!notification?.id || !pushResponse.ok) return notification;

  let pushBody = null;
  try {
    pushBody = JSON.parse(pushText);
  } catch {
    pushBody = null;
  }

  if ((pushBody?.sent ?? 0) <= 0) return notification;

  const nextMetadata = {
    ...(notification.metadata || {}),
    pushSentAt: new Date().toISOString(),
    pushResult: {
      sent: pushBody.sent,
      failed: pushBody.failed ?? 0,
    },
  };

  await fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${notification.id}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ metadata: nextMetadata }),
  }).catch(() => null);

  return { ...notification, metadata: nextMetadata };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    json(res, 500, {
      ok: false,
      error: 'Missing SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY.',
    });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!accessToken) {
    json(res, 401, { ok: false, error: 'Missing Authorization bearer token.' });
    return;
  }

  const body = readBody(req);
  const payload = {
    recipient_user_id: body.recipientUserId,
    type: body.type,
    title: body.title,
    body: body.body,
    metadata: body.metadata || {},
  };

  if (!payload.recipient_user_id || !payload.type || !payload.title || !payload.body) {
    json(res, 400, { ok: false, error: 'Missing required notification fields.' });
    return;
  }

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      json(res, 401, { ok: false, error: 'Invalid or expired user session.' });
      return;
    }

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    const insertText = await insertResponse.text();
    if (!insertResponse.ok) {
      json(res, 502, {
        ok: false,
        error: 'Failed to insert notification.',
        supabaseStatus: insertResponse.status,
        details: insertText.slice(0, 500),
      });
      return;
    }

    const notification = JSON.parse(insertText)[0];
    const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ record: notification }),
    });

    const pushText = await pushResponse.text();
    const markedNotification = await addPushMarker(notification, pushResponse, pushText);

    json(res, pushResponse.ok ? 200 : 207, {
      ok: true,
      notification: markedNotification,
      push: {
        ok: pushResponse.ok,
        status: pushResponse.status,
        body: pushText.slice(0, 500),
      },
    });
  } catch (error) {
    json(res, 502, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
