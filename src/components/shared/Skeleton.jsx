/**
 * Skeleton loading components — match the app's dark-glass design system.
 *
 * Usage:
 *   <Skeleton />              — single line block
 *   <Skeleton.Card />         — generic card placeholder
 *   <Skeleton.ClientRow />    — trainee list row
 *   <Skeleton.StatGrid />     — 2×2 stats grid (Dashboard)
 *   <Skeleton.SessionItem />  — session list item
 *   <Skeleton.PaymentItem />  — payment row
 */

import React from 'react';

// ── Base shimmer block ─────────────────────────────────────────────────────────
const BASE_CLASSES =
  'rounded-[10px] bg-white/[0.05] animate-pulse';

export default function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`${BASE_CLASSES} ${className}`} />;
}

// ── Stat card grid (home dashboard) ──────────────────────────────────────────
Skeleton.StatGrid = function StatGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4 space-y-2"
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-2.5 w-24 opacity-50" />
        </div>
      ))}
    </div>
  );
};

// ── Client / trainee list row ─────────────────────────────────────────────────
Skeleton.ClientRow = function ClientRow() {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-3.5">
      {/* Avatar */}
      <div className="h-11 w-11 shrink-0 rounded-full bg-white/[0.07] animate-pulse" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-20 opacity-60" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full opacity-50" />
    </div>
  );
};

Skeleton.ClientList = function ClientList({ rows = 5 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton.ClientRow key={i} />
      ))}
    </div>
  );
};

// ── Session item ──────────────────────────────────────────────────────────────
Skeleton.SessionItem = function SessionItem() {
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="h-10 w-10 shrink-0 rounded-[14px] bg-white/[0.07] animate-pulse" />
      <div className="flex-1 space-y-2 pt-0.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-2.5 w-24 opacity-60" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full opacity-50" />
    </div>
  );
};

Skeleton.SessionList = function SessionList({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton.SessionItem key={i} />
      ))}
    </div>
  );
};

// ── Payment row ───────────────────────────────────────────────────────────────
Skeleton.PaymentItem = function PaymentItem() {
  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-20 opacity-60" />
        </div>
        <Skeleton className="h-6 w-14 rounded-full opacity-50" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-16 opacity-40" />
      </div>
    </div>
  );
};

Skeleton.PaymentList = function PaymentList({ rows = 4 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton.PaymentItem key={i} />
      ))}
    </div>
  );
};

// ── Generic card ──────────────────────────────────────────────────────────────
Skeleton.Card = function Card({ lines = 3, className = '' }) {
  return (
    <div className={`rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4 space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === 0 ? 'w-3/4' : i === lines - 1 ? 'w-2/5 opacity-50' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

// ── Full page loading state ───────────────────────────────────────────────────
Skeleton.Page = function Page() {
  return (
    <div className="flex flex-col gap-4 p-4 pt-2 animate-pulse">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      {/* Stats */}
      <Skeleton.StatGrid />
      {/* List */}
      <Skeleton.ClientList rows={3} />
    </div>
  );
};
