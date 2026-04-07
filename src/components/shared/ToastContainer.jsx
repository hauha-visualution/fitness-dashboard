import React, { useEffect, useState, useCallback } from 'react';
import { subscribe } from '../../utils/toast';

let nextId = 0;

const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
};

const STYLES = {
  success: {
    icon: 'text-[#c8f53f]',
    bar:  'bg-[#c8f53f]',
    border: 'border-[rgba(200,245,63,0.18)]',
  },
  error: {
    icon: 'text-[#ff6b6b]',
    bar:  'bg-[#ff6b6b]',
    border: 'border-[rgba(255,107,107,0.18)]',
  },
  info: {
    icon: 'text-[#60b4ff]',
    bar:  'bg-[#60b4ff]',
    border: 'border-[rgba(96,180,255,0.18)]',
  },
  warning: {
    icon: 'text-[#ffaa55]',
    bar:  'bg-[#ffaa55]',
    border: 'border-[rgba(255,170,85,0.18)]',
  },
};

const ToastItem = ({ id, type, message, duration, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(id), 280);
  }, [id, onDismiss]);

  useEffect(() => {
    // Mount animation
    const show = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    const hide = setTimeout(dismiss, duration);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [dismiss, duration]);

  const s = STYLES[type] || STYLES.info;

  return (
    <div
      className={`relative overflow-hidden flex items-start gap-3 rounded-[18px] border bg-[rgba(8,14,25,0.95)] backdrop-blur-xl px-4 py-3.5 shadow-2xl shadow-black/40 transition-all duration-300 ease-out max-w-[340px] w-full ${s.border} ${
        visible && !leaving
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-2 scale-95'
      }`}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[2px] ${s.bar} rounded-full opacity-50`}
        style={{
          animation: `shrink ${duration}ms linear forwards`,
        }}
      />
      <span className={`mt-0.5 shrink-0 ${s.icon}`}>{ICONS[type]}</span>
      <p className="text-[13px] font-medium text-white/90 leading-snug flex-1 pr-1">{message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 mt-0.5 text-white/30 hover:text-white/70 transition-colors"
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribe((event) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, ...event }]);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
