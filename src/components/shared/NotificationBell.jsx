import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Bell, BellDot, Check, CheckCheck, Dumbbell, X,
  Package, Utensils, CreditCard, AlertTriangle,
  CalendarPlus, BadgeDollarSign,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { NOTIFICATION_TYPES } from '../../utils/notificationUtils';
import PushNotificationToggle from './PushNotificationToggle';

// ─── Icon per notification type ──────────────────────────────
const NotifIcon = ({ type }) => {
  const cls = 'w-4 h-4 shrink-0';
  switch (type) {
    case NOTIFICATION_TYPES.SESSION_COMPLETED:
      return <Check className={`${cls} text-emerald-400`} />;
    case NOTIFICATION_TYPES.SESSION_CANCELLED:
      return <X className={`${cls} text-red-400`} />;
    case NOTIFICATION_TYPES.SESSION_EXTRA:
      return <CalendarPlus className={`${cls} text-blue-400`} />;
    case NOTIFICATION_TYPES.LOW_SESSIONS:
      return <AlertTriangle className={`${cls} text-amber-400`} />;
    case NOTIFICATION_TYPES.PACKAGE_CREATED:
      return <Package className={`${cls} text-violet-400`} />;
    case NOTIFICATION_TYPES.NUTRITION_UPDATED:
      return <Utensils className={`${cls} text-lime-400`} />;
    case NOTIFICATION_TYPES.PAYMENT_CREATED:
      return <CreditCard className={`${cls} text-sky-400`} />;
    case NOTIFICATION_TYPES.PAYMENT_SUBMITTED:
      return <BadgeDollarSign className={`${cls} text-amber-400`} />;
    case NOTIFICATION_TYPES.PAYMENT_CONFIRMED:
      return <Check className={`${cls} text-emerald-400`} />;
    default:
      return <Dumbbell className={`${cls} text-neutral-400`} />;
  }
};

// ─── Time label ───────────────────────────────────────────────
const timeAgo = (isoStr) => {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
};

// ─── Single notification row ──────────────────────────────────
const NotifRow = ({ notif, onMarkRead, index = 0 }) => (
  <button
    type="button"
    onClick={() => !notif.is_read && onMarkRead(notif.id)}
    className={`animate-notif-row w-full text-left flex items-start gap-3 px-4 py-3.5 transition-all active:scale-[0.99] ${
      !notif.is_read
        ? 'bg-white/[0.04] hover:bg-white/[0.06]'
        : 'hover:bg-white/[0.02]'
    }`}
    style={{ animationDelay: `${index * 40}ms` }}
  >
    {/* Icon bubble */}
    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
      notif.is_read
        ? 'border-white/[0.06] bg-white/[0.02]'
        : 'border-white/10 bg-white/[0.07]'
    }`}>
      <NotifIcon type={notif.type} />
    </div>

    {/* Content */}
    <div className="min-w-0 flex-1">
      <p className={`text-[13px] font-semibold leading-snug ${
        notif.is_read ? 'text-neutral-400' : 'text-white'
      }`}>
        {notif.title}
      </p>
      <p className={`mt-0.5 text-[11px] leading-relaxed ${
        notif.is_read ? 'text-neutral-600' : 'text-neutral-400'
      }`}>
        {notif.body}
      </p>
      <p className="mt-1.5 text-[10px] font-medium text-neutral-700">
        {timeAgo(notif.created_at)}
      </p>
    </div>

    {/* Unread dot */}
    {!notif.is_read && (
      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--app-accent,#c8f53f)]" />
    )}
  </button>
);

// ─── Portal dropdown ──────────────────────────────────────────
const NotifPanel = ({ anchorRef, onClose, notifications, unreadCount, loading, markRead, markAllRead, userId }) => {
  const panelRef = useRef(null);

  // Calculate position from the anchor button
  const getStyle = useCallback(() => {
    if (!anchorRef.current) return {};
    const rect = anchorRef.current.getBoundingClientRect();
    const panelWidth = Math.min(360, window.innerWidth - 24);

    // Try to align right edge of panel with right edge of button
    let left = rect.right - panelWidth;
    // Clamp so it doesn't go off-screen left
    if (left < 12) left = 12;
    // Also don't overflow right
    if (left + panelWidth > window.innerWidth - 12) {
      left = window.innerWidth - panelWidth - 12;
    }

    const top = rect.bottom + 8;

    return {
      position: 'fixed',
      top,
      left,
      width: panelWidth,
      zIndex: 99999,
    };
  }, [anchorRef]);

  const [style, setStyle] = useState({});

  // Recalculate on scroll / resize
  useEffect(() => {
    const recalc = () => setStyle(getStyle());
    recalc();
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => {
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [getStyle]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    // Use timeout so the click that opened the panel doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handleClick), 10);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <>
      {/* ── Backdrop: blur + dim, closes panel on tap ── */}
      <div
        className="animate-notif-backdrop fixed inset-0 z-[99990] bg-black/40 backdrop-blur-sm"
        style={{ WebkitBackdropFilter: 'blur(6px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Panel floats above backdrop ── */}
      <div
        ref={panelRef}
        style={{ ...style, zIndex: 99999 }}
        className="animate-notif-panel app-glass-panel overflow-hidden rounded-[22px] border shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      >

      {/* Subtle top glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-neutral-400" />
          <span className="text-[13px] font-semibold text-white">Thông báo</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[var(--app-accent,#c8f53f)]/20 px-2 py-0.5 text-[10px] font-black text-[var(--app-accent,#c8f53f)]">
              {unreadCount} mới
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-neutral-500 transition-all hover:bg-white/[0.06] hover:text-white"
            >
              <CheckCheck className="w-3 h-3" />
              Đọc tất cả
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-600 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Push setting */}
      {userId ? (
        <div className="border-b border-white/[0.06] px-3 py-3">
          <PushNotificationToggle userId={userId} />
        </div>
      ) : null}

      {/* Notification list */}
      <div className="max-h-[min(420px,calc(100dvh-120px))] overflow-y-auto divide-y divide-white/[0.04]"
        style={{ scrollbarWidth: 'none' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-14 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02]">
              <Bell className="w-5 h-5 text-neutral-700" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-700">
              Chưa có thông báo
            </p>
            <p className="text-[10px] text-neutral-800">
              Các hoạt động sẽ xuất hiện tại đây
            </p>
          </div>
        ) : (
          notifications.map((notif, i) => (
            <NotifRow key={notif.id} notif={notif} onMarkRead={markRead} index={i} />
          ))
        )}
      </div>
    </div>
    </>,
    document.body,
  );
};

// ─── Main component ───────────────────────────────────────────
/**
 * NotificationBell
 * @param {string|null} userId  - auth.uid() của user đang đăng nhập
 * @param {string}      [className]
 */
const NotificationBell = ({ userId, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);

  const { notifications, unreadCount, loading, markRead, markAllRead } =
    useNotifications(userId);

  const handleToggle = () => setIsOpen((v) => !v);
  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`app-ghost-button relative p-2.5 border rounded-full transition-all active:scale-90 ${unreadCount > 0 ? 'app-highlight-glow' : ''}`}
        aria-label="Thông báo"
      >
        {unreadCount > 0 ? (
          <BellDot className="w-4 h-4 text-[var(--app-accent,#c8f53f)]" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="animate-notif-badge pointer-events-none absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--app-accent,#c8f53f)] px-1 text-[9px] font-black leading-none text-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Portal-rendered dropdown — always above everything */}
      {isOpen && (
        <NotifPanel
          anchorRef={buttonRef}
          onClose={handleClose}
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          markRead={markRead}
          markAllRead={markAllRead}
          userId={userId}
        />
      )}
    </div>
  );
};

export default NotificationBell;
