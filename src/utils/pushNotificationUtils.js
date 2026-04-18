import { supabase } from '../supabaseClient';

// ─── VAPID Public Key ─────────────────────────────────────────
// Generated via: npx web-push generate-vapid-keys
// Replace this with your actual VAPID public key from Supabase Edge Function secrets
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const PUSH_SUBSCRIPTIONS_TABLE = 'push_subscriptions';
const PUSH_BACKEND_UNAVAILABLE_CODE = 'push_backend_unavailable';

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

const getServiceWorkerRegistration = async () => {
  const directRegistration = await navigator.serviceWorker.getRegistration();
  if (directRegistration) return directRegistration;

  // Ensure we always have a SW registration before using PushManager.
  // Some environments don't auto-register, which makes toggle look "stuck".
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    // Fallback for setups serving only the custom push worker directly.
    return navigator.serviceWorker.register('/sw-push.js');
  }
};

const persistSubscription = async (userId, subscription) => {
  const subJson = subscription?.toJSON?.();
  if (!userId || !subJson?.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
    return { success: false, error: 'Push subscription không hợp lệ' };
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    },
    { onConflict: 'user_id,endpoint' }
  );

  if (error) {
    console.error('[Push] upsert error:', error.message);
    return mapPushPersistenceError(error);
  }

  return { success: true };
};

const isPushTableMissingError = (message = '') => {
  const normalized = String(message || '').toLowerCase();
  return (
    (normalized.includes('could not find the table') && normalized.includes(PUSH_SUBSCRIPTIONS_TABLE))
    || normalized.includes(`relation "public.${PUSH_SUBSCRIPTIONS_TABLE}" does not exist`)
    || normalized.includes(`relation "${PUSH_SUBSCRIPTIONS_TABLE}" does not exist`)
  );
};

const mapPushPersistenceError = (error) => {
  const message = error?.message || 'Không thể đồng bộ đăng ký thông báo';
  if (isPushTableMissingError(message)) {
    return {
      success: false,
      code: PUSH_BACKEND_UNAVAILABLE_CODE,
      error: 'Tính năng thông báo đang được cập nhật trên hệ thống, vui lòng thử lại sau.',
    };
  }

  return { success: false, error: message };
};

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
  if (!userId) return { success: false, error: 'Thiếu userId để đăng ký thông báo' };
  if (!VAPID_PUBLIC_KEY) return { success: false, error: 'VAPID_PUBLIC_KEY chưa được cấu hình' };

  try {
    // 1. Xin quyền
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Người dùng từ chối quyền thông báo' };
    }

    // 2. Lấy Service Worker registration
    const registration = await getServiceWorkerRegistration();

    // 3. Reuse subscription cũ nếu đã có, tránh InvalidStateError trên iOS/Safari
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // 4. Upsert vào Supabase (tránh duplicate / resync khi row server bị mất)
    const syncResult = await persistSubscription(userId, subscription);
    if (!syncResult.success) {
      // Keep browser permission, but roll back device subscription when backend isn't ready.
      if (syncResult.code === PUSH_BACKEND_UNAVAILABLE_CODE) {
        await subscription.unsubscribe().catch(() => {});
      }
      return syncResult;
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
  if (!isPushSupported()) return { success: false, error: 'Push not supported on this device' };
  if (!userId) return { success: false, error: 'Thiếu userId để hủy thông báo' };

  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
      if (error) {
        const mapped = mapPushPersistenceError(error);
        return mapped;
      }
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
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};

export const syncPushSubscription = async (userId) => {
  if (!isPushSupported() || !userId) return { success: false, error: 'Push not supported on this device' };

  try {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { success: false, error: 'Chưa có push subscription trên thiết bị này' };
    }

    return persistSubscription(userId, subscription);
  } catch (err) {
    console.error('[Push] sync error:', err);
    return { success: false, error: err.message };
  }
};
