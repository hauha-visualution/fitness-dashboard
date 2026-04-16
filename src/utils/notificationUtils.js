import { supabase } from '../supabaseClient';

// ─── Notification Types ───────────────────────────────────────
export const NOTIFICATION_TYPES = {
  SESSION_COMPLETED:       'session_completed',
  SESSION_CANCELLED:       'session_cancelled',
  SESSION_EXTRA:           'session_extra',
  LOW_SESSIONS:            'low_sessions',
  PACKAGE_CREATED:         'package_created',
  NUTRITION_UPDATED:       'nutrition_updated',
  PAYMENT_CREATED:         'payment_created',
  PAYMENT_SUBMITTED:       'payment_submitted',
  PAYMENT_CONFIRMED:       'payment_confirmed',
};

// Ngưỡng buổi còn lại để trigger low_sessions alert
export const LOW_SESSION_THRESHOLDS = [5, 3, 1];

// ─── Core insert ─────────────────────────────────────────────
export const createNotification = async ({ recipientUserId, type, title, body, metadata = {} }) => {
  if (!recipientUserId) return;
  const { error } = await supabase.from('notifications').insert({
    recipient_user_id: recipientUserId,
    type,
    title,
    body,
    metadata,
  });
  if (error) console.error('[Notification] insert error:', error.message);
};

// ─── Mark read ───────────────────────────────────────────────
export const markNotificationRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) console.error('[Notification] mark read error:', error.message);
};

export const markAllNotificationsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_user_id', userId)
    .eq('is_read', false);
  if (error) console.error('[Notification] mark all read error:', error.message);
};

// ─── Format helpers ───────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const fmtVND = (amount) => {
  if (!amount) return '';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const pkgLabel = (num) => `Gói #${String(num).padStart(2, '0')}`;
const buildNotificationLinkMeta = (url, targetTab, extra = {}) => ({
  ...extra,
  url,
  targetTab,
});

// ─── Event notification helpers ───────────────────────────────

export const notifySessionCompleted = async ({ clientAuthUserId, sessionNumber, scheduledDate }) => {
  if (!clientAuthUserId) return;
  await createNotification({
    recipientUserId: clientAuthUserId,
    type: NOTIFICATION_TYPES.SESSION_COMPLETED,
    title: 'Buổi tập hoàn thành 💪',
    body: `Buổi #${String(sessionNumber).padStart(2, '0')} ngày ${formatDate(scheduledDate)} đã được coach ghi nhận hoàn thành.`,
    metadata: buildNotificationLinkMeta('/portal?tab=sessions', 'sessions', { sessionNumber, scheduledDate }),
  });
};

export const notifySessionCancelled = async ({ clientAuthUserId, sessionNumber, scheduledDate, reason }) => {
  if (!clientAuthUserId) return;
  await createNotification({
    recipientUserId: clientAuthUserId,
    type: NOTIFICATION_TYPES.SESSION_CANCELLED,
    title: 'Buổi tập bị hủy',
    body: `Buổi #${String(sessionNumber).padStart(2, '0')} ngày ${formatDate(scheduledDate)} đã bị hủy.${reason ? ` Lý do: ${reason}.` : ''}`,
    metadata: buildNotificationLinkMeta('/portal?tab=sessions', 'sessions', { sessionNumber, scheduledDate, reason }),
  });
};

export const notifyExtraSessionAdded = async ({ clientAuthUserId, scheduledDate, scheduledTime }) => {
  if (!clientAuthUserId) return;
  const timeLabel = scheduledTime ? ` lúc ${scheduledTime.slice(0, 5)}` : '';
  await createNotification({
    recipientUserId: clientAuthUserId,
    type: NOTIFICATION_TYPES.SESSION_EXTRA,
    title: 'Buổi tập mới được thêm 📅',
    body: `Coach vừa thêm buổi tập vào ngày ${formatDate(scheduledDate)}${timeLabel}.`,
    metadata: buildNotificationLinkMeta('/portal?tab=sessions', 'sessions', { scheduledDate, scheduledTime }),
  });
};

export const notifyLowSessions = async ({ clientAuthUserId, coachAuthUserId, clientName, remaining, packageNumber }) => {
  const promises = [];

  // Thông báo cho coach
  if (coachAuthUserId) {
    promises.push(createNotification({
      recipientUserId: coachAuthUserId,
      type: NOTIFICATION_TYPES.LOW_SESSIONS,
      title: `⚠️ Sắp hết buổi — còn ${remaining} buổi`,
      body: `${pkgLabel(packageNumber)} của ${clientName || 'trainee'} chỉ còn ${remaining} buổi. Cần gia hạn sớm.`,
      metadata: buildNotificationLinkMeta('/?tab=clients', 'clients', { clientName, remaining, packageNumber }),
    }));
  }

  // Thông báo cho trainee
  if (clientAuthUserId) {
    promises.push(createNotification({
      recipientUserId: clientAuthUserId,
      type: NOTIFICATION_TYPES.LOW_SESSIONS,
      title: `⚠️ Gói tập sắp hết — còn ${remaining} buổi`,
      body: `${pkgLabel(packageNumber)} của bạn chỉ còn ${remaining} buổi tập. Hãy liên hệ coach để gia hạn.`,
      metadata: buildNotificationLinkMeta('/portal?tab=package', 'package', { remaining, packageNumber }),
    }));
  }

  await Promise.all(promises);
};

export const notifyPackageCreated = async ({ clientAuthUserId, packageNumber, totalSessions }) => {
  if (!clientAuthUserId) return;
  await createNotification({
    recipientUserId: clientAuthUserId,
    type: NOTIFICATION_TYPES.PACKAGE_CREATED,
    title: 'Gói tập mới được tạo 🎯',
    body: `Coach vừa tạo ${pkgLabel(packageNumber)} cho bạn với ${totalSessions} buổi tập.`,
    metadata: buildNotificationLinkMeta('/portal?tab=package', 'package', { packageNumber, totalSessions }),
  });
};

export const notifyNutritionUpdated = async ({ clientAuthUserId }) => {
  if (!clientAuthUserId) return;
  await createNotification({
    recipientUserId: clientAuthUserId,
    type: NOTIFICATION_TYPES.NUTRITION_UPDATED,
    title: 'Kế hoạch dinh dưỡng cập nhật 🥗',
    body: 'Coach vừa cập nhật kế hoạch dinh dưỡng của bạn. Kiểm tra tab Nutrition ngay nhé.',
    metadata: buildNotificationLinkMeta('/portal?tab=nutrition', 'nutrition'),
  });
};

export const notifyPaymentCreated = async ({ clientAuthUserId, amount, packageNumber }) => {
  if (!clientAuthUserId) return;
  const amountLabel = amount ? `: ${fmtVND(amount)}` : '';
  const pkgStr = packageNumber ? ` cho ${pkgLabel(packageNumber)}` : '';
  await createNotification({
    recipientUserId: clientAuthUserId,
    type: NOTIFICATION_TYPES.PAYMENT_CREATED,
    title: 'Ghi nhận thanh toán mới 💳',
    body: `Coach vừa ghi nhận thanh toán${pkgStr}${amountLabel}.`,
    metadata: buildNotificationLinkMeta('/portal?tab=payment', 'payment', { amount, packageNumber }),
  });
};

// ─── Low sessions check (gọi sau mỗi session completed/cancelled) ──
/**
 * Sau khi 1 session thay đổi trạng thái, kiểm tra remaining của package.
 * Nếu remaining rơi vào ngưỡng [5, 3, 1] → gửi alert cho cả coach lẫn trainee.
 */
export const checkAndNotifyLowSessions = async ({ packageId, clientId, coachAuthUserId }) => {
  if (!packageId || !clientId) return;

  try {
    const [pkgResult, countResult, clientResult] = await Promise.all([
      supabase
        .from('packages')
        .select('id, package_number, total_sessions, status')
        .eq('id', packageId)
        .single(),
      supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('package_id', packageId)
        .eq('status', 'completed'),
      supabase
        .from('clients')
        .select('auth_user_id, name')
        .eq('id', clientId)
        .single(),
    ]);

    const pkg = pkgResult.data;
    const completedCount = countResult.count ?? 0;
    const client = clientResult.data;

    if (!pkg || pkg.status !== 'active') return;

    const remaining = pkg.total_sessions - completedCount;

    // Chỉ notify tại các ngưỡng chính xác để tránh spam
    if (LOW_SESSION_THRESHOLDS.includes(remaining)) {
      await notifyLowSessions({
        clientAuthUserId: client?.auth_user_id,
        coachAuthUserId,
        clientName: client?.name || 'Trainee',
        remaining,
        packageNumber: pkg.package_number,
      });
    }
  } catch (err) {
    console.error('[checkAndNotifyLowSessions] error:', err.message);
  }
};

/**
 * Lấy thông tin cần thiết để gửi notification cho trainee từ một clientId.
 * Trả về { auth_user_id, name } hoặc null.
 */
export const fetchClientNotifInfo = async (clientId) => {
  if (!clientId) return null;
  const { data } = await supabase
    .from('clients')
    .select('auth_user_id, name')
    .eq('id', clientId)
    .single();
  return data || null;
};

/**
 * Lấy auth_user_id của coach từ email.
 * Trả về UUID string hoặc null.
 */
export const fetchCoachAuthUserId = async (coachEmail) => {
  if (!coachEmail) return null;
  const { data } = await supabase
    .from('coaches')
    .select('auth_user_id')
    .eq('email', coachEmail)
    .maybeSingle();
  return data?.auth_user_id || null;
};

export const notifyPaymentSubmitted = async ({ coachAuthUserId, clientName, amount, paymentTitle }) => {
  if (!coachAuthUserId) return;
  const amountLabel = amount ? ` — ${fmtVND(amount)}` : '';
  await createNotification({
    recipientUserId: coachAuthUserId,
    type: NOTIFICATION_TYPES.PAYMENT_SUBMITTED,
    title: `💸 ${clientName || 'Trainee'} đã chuyển khoản`,
    body: `${clientName || 'Trainee'} báo đã chuyển khoản cho "${paymentTitle || 'payment'}"${amountLabel}. Vui lòng xác nhận.`,
    metadata: buildNotificationLinkMeta('/?tab=payments', 'payments', { clientName, amount, paymentTitle }),
  });
};

export const notifyPaymentConfirmed = async ({ clientAuthUserId, amount, paymentTitle }) => {
  if (!clientAuthUserId) return;
  const amountLabel = amount ? ` ${fmtVND(amount)}` : '';
  await createNotification({
    recipientUserId: clientAuthUserId,
    type: NOTIFICATION_TYPES.PAYMENT_CONFIRMED,
    title: 'Thanh toán đã được xác nhận ✅',
    body: `Coach đã xác nhận thanh toán "${paymentTitle || 'payment'}"${amountLabel} thành công.`,
    metadata: buildNotificationLinkMeta('/portal?tab=payment', 'payment', { amount, paymentTitle }),
  });
};
