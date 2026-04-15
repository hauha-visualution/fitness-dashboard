import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader } from 'lucide-react';
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isAlreadySubscribed,
} from '../../utils/pushNotificationUtils';

/**
 * Toggle bật/tắt push notification — dùng trong trang Profile.
 * @param {{ userId: string }} props
 */
export default function PushNotificationToggle({ userId }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!userId) return;

    if (!isPushSupported()) {
      setStatus('unsupported');
      return;
    }

    const perm = getPushPermission();
    if (perm === 'denied') {
      setStatus('denied');
      return;
    }

    isAlreadySubscribed().then((already) => {
      setStatus(already ? 'subscribed' : 'unsubscribed');
    });
  }, [userId]);

  const handleToggle = async () => {
    if (working) return;
    setWorking(true);

    if (status === 'subscribed') {
      // Tắt thông báo
      const { success } = await unsubscribeFromPush(userId);
      if (success) setStatus('unsubscribed');
    } else {
      // Bật thông báo — xoá dismissed flag để cho phép re-subscribe
      localStorage.removeItem('push_prompt_dismissed');
      const { success, error } = await subscribeToPush(userId);
      if (success) {
        setStatus('subscribed');
      } else if (getPushPermission() === 'denied') {
        setStatus('denied');
      } else {
        console.warn('[PushToggle]', error);
      }
    }

    setWorking(false);
  };

  // Không render nếu không support
  if (status === 'loading' || status === 'unsupported') return null;

  const isOn = status === 'subscribed';
  const isDenied = status === 'denied';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        marginBottom: '0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: isOn
              ? 'rgba(200,245,63,0.12)'
              : isDenied
              ? 'rgba(255,80,80,0.10)'
              : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isOn ? 'rgba(200,245,63,0.25)' : isDenied ? 'rgba(255,80,80,0.2)' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isOn ? (
            <Bell size={16} color="var(--app-accent, #c8f53f)" />
          ) : (
            <BellOff size={16} color={isDenied ? '#ff6060' : 'rgba(255,255,255,0.3)'} />
          )}
        </div>

        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            Push Notifications
          </p>
          <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>
            {isDenied
              ? 'Bị chặn — vào Settings iOS để mở lại'
              : isOn
              ? 'Đang bật — nhận thông báo realtime'
              : 'Chưa bật — bấm để kích hoạt'}
          </p>
        </div>
      </div>

      {/* Toggle switch */}
      {!isDenied && (
        <button
          id="push-toggle-btn"
          onClick={handleToggle}
          disabled={working}
          aria-label={isOn ? 'Tắt thông báo' : 'Bật thông báo'}
          style={{
            flexShrink: 0,
            width: '46px',
            height: '26px',
            borderRadius: '13px',
            background: isOn ? 'var(--app-accent, #c8f53f)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            cursor: working ? 'not-allowed' : 'pointer',
            position: 'relative',
            transition: 'background 0.25s ease',
            opacity: working ? 0.6 : 1,
          }}
        >
          {working ? (
            <Loader
              size={12}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: isOn ? '#000' : 'rgba(255,255,255,0.6)',
                animation: 'spin 1s linear infinite',
              }}
            />
          ) : (
            <span
              style={{
                position: 'absolute',
                top: '3px',
                left: isOn ? 'calc(100% - 23px)' : '3px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: isOn ? '#000' : 'rgba(255,255,255,0.4)',
                transition: 'left 0.25s ease',
              }}
            />
          )}
        </button>
      )}
    </div>
  );
}
