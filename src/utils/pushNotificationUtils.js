import { supabase } from '../supabaseClient';

// ─── VAPID Public Key ─────────────────────────────────────────
// Generated via: npx web-push generate-vapid-keys
// Replace this with your actual VAPID public key from Supabase Edge Function secrets
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// ─── Helpers ─────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ─── Check support ────────────────────────────────────────────
export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const getPushPermission = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
};

// ─── Subscribe ────────────────────────────────────────────────
/**
 * Xin quyền push notification và lưu subscription vào Supabase.
 * @param {string} userId - auth.users UUID của user hiện tại
 * @returns {{ success: boolean, error?: string }}
 */
export const subscribeToPush = async (userId) => {
  if (!isPushSupported()) return { success: false, error: 'Push not supported on this device' };
  if (!VAPID_PUBLIC_KEY) return { success: false, error: 'VAPID_PUBLIC_KEY chưa được cấu hình' };

  try {
    // 1. Xin quyền
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Người dùng từ chối quyền thông báo' };
    }

    // 2. Lấy Service Worker registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Subscribe Web Push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = subscription.toJSON();

    // 4. Upsert vào Supabase (tránh duplicate)
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
      { onConflict: 'user_id,endpoint' }
    );

    if (error) {
      console.error('[Push] upsert error:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[Push] Subscribed successfully');
    return { success: true };
  } catch (err) {
    console.error('[Push] subscribe error:', err);
    return { success: false, error: err.message };
  }
};

// ─── Unsubscribe ──────────────────────────────────────────────
/**
 * Hủy subscription và xóa khỏi Supabase.
 * @param {string} userId
 */
export const unsubscribeFromPush = async (userId) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }
    return { success: true };
  } catch (err) {
    console.error('[Push] unsubscribe error:', err);
    return { success: false, error: err.message };
  }
};

// ─── Check if already subscribed ─────────────────────────────
export const isAlreadySubscribed = async () => {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};
