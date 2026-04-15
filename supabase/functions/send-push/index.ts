// Supabase Edge Function: send-push
// Đặt tại: supabase/functions/send-push/index.ts
// Deploy: supabase functions deploy send-push

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@aestheticshub.app';

// Cấu hình VAPID một lần khi khởi tạo
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ─── Main Handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const payload = await req.json();

    // Webhook từ Supabase DB → payload là record INSERT
    const notification = payload.record || payload;
    const recipientUserId = notification.recipient_user_id;
    const title = notification.title || 'Thông báo mới';
    const body = notification.body || '';
    const metadata = notification.metadata || {};

    if (!recipientUserId) {
      return new Response(JSON.stringify({ error: 'Missing recipient_user_id' }), { status: 400 });
    }

    // Khởi tạo Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Lấy tất cả subscriptions của user
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', recipientUserId);

    if (subError) {
      console.error('[send-push] fetch subscriptions error:', subError.message);
      return new Response(JSON.stringify({ error: subError.message }), { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[send-push] No subscriptions for user ${recipientUserId}`);
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), { status: 200 });
    }

    // Payload đúng chuẩn Web Push — sẽ được mã hóa bởi web-push
    const pushPayload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: {
        ...metadata,
        notificationId: notification.id,
        url: '/',
      },
    });

    // Gửi push đến tất cả thiết bị của user
    const expiredEndpoints: string[] = [];

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          const result = await webpush.sendNotification(pushSubscription, pushPayload, {
            TTL: 86400, // 24h
          });
          return result;
        } catch (err: any) {
          // 404 / 410 → subscription hết hạn → xóa khỏi DB
          if (err.statusCode === 404 || err.statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
            console.warn(`[send-push] Expired subscription removed: ${sub.endpoint.slice(-20)}`);
          } else {
            console.error(`[send-push] Send failed (${err.statusCode}):`, err.body || err.message);
          }
          throw err;
        }
      })
    );

    // Xóa các subscription đã hết hạn
    if (expiredEndpoints.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
      if (deleteError) {
        console.error('[send-push] cleanup expired error:', deleteError.message);
      } else {
        console.log(`[send-push] Cleaned up ${expiredEndpoints.length} expired subscription(s)`);
      }
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[send-push] Sent: ${sent}, Failed: ${failed}`);
    return new Response(JSON.stringify({ sent, failed }), { status: 200 });

  } catch (err: any) {
    console.error('[send-push] error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
