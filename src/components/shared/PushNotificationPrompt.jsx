import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  isAlreadySubscribed,
} from '../../utils/pushNotificationUtils';

/**
 * Banner nhắc user bật push notification.
 * Tự ẩn sau khi user bật hoặc bấm dismiss (lưu vào localStorage).
 *
 * @param {{ userId: string }} props
 */
export default function PushNotificationPrompt({ userId }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!userId || !isPushSupported()) return;

    const permission = getPushPermission();

    // Nếu permission vẫn là 'default' (chưa bao giờ grant/deny) → reset dismissed để re-show
    if (permission === 'default') {
      localStorage.removeItem('push_prompt_dismissed');
    }

    const dismissed = localStorage.getItem('push_prompt_dismissed');
    if (dismissed) return;
    if (permission === 'granted') {
      // Có thể đã subscribed — kiểm tra
      isAlreadySubscribed().then((already) => setSubscribed(already));
      return;
    }

    if (permission === 'denied') return; // Không hiện nếu đã deny

    // default → hiện banner sau 3s
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [userId]);

  const handleEnable = async () => {
    setLoading(true);
    const { success, error } = await subscribeToPush(userId);
    setLoading(false);
    if (success) {
      setSubscribed(true);
      setVisible(false);
    } else {
      console.warn('[PushPrompt] subscribe failed:', error);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', '1');
    setVisible(false);
  };

  if (!visible || subscribed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '380px',
        zIndex: 9999,
        animation: 'slideUp 0.35s ease-out forwards',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30,30,40,0.97) 0%, rgba(20,20,30,0.97) 100%)',
          border: '1px solid rgba(200,245,63,0.2)',
          borderRadius: '20px',
          padding: '16px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(200,245,63,0.12)',
            border: '1px solid rgba(200,245,63,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bell size={18} color="var(--app-accent, #c8f53f)" />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
            Bật thông báo
          </p>
          <p style={{ margin: '4px 0 12px', fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
            Nhận ngay khi coach cập nhật buổi tập, thanh toán, dinh dưỡng.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              id="push-enable-btn"
              onClick={handleEnable}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'var(--app-accent, #c8f53f)',
                color: '#000',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Đang bật...' : 'Bật thông báo'}
            </button>
            <button
              id="push-dismiss-btn"
              onClick={handleDismiss}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 600,
                fontSize: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
              }}
            >
              Để sau
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          id="push-close-btn"
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
