import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { CalendarDays, Camera, MapPin, Plus, RefreshCw, Save, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import ClientAvatar from '../../shared/ClientAvatar';
import { parseServiceBooking, parseServiceMeta } from '../../../utils/serviceUtils';

const EditableField = ({ label, value, onChange, type = 'text' }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-600">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[16px] border border-white/[0.08] bg-black/40 px-4 py-3 text-sm font-normal text-white outline-none transition-all focus:border-blue-500/50"
    />
  </div>
);

const InfoCell = ({ label, value, valueClassName = 'text-xs font-semibold text-white', className = '' }) => (
  <div className={`p-4 ${className}`}>
    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">{label}</p>
    <p className={`mt-2 leading-tight ${valueClassName}`}>{value || '--'}</p>
  </div>
);

const TIME_FILTER_OPTIONS = [
  { id: '1m', label: '1 month', shortLabel: '1M', months: 1 },
  { id: '3m', label: '3 months', shortLabel: '3M', months: 3 },
  { id: '6m', label: '6 months', shortLabel: '6M', months: 6 },
  { id: '9m', label: '9 months', shortLabel: '9M', months: 9 },
  { id: '12m', label: '12 months', shortLabel: '12M', months: 12 },
  { id: 'all', label: 'All', shortLabel: 'ALL', months: null },
];

const INBODY_METRICS = [
  {
    key: 'weight',
    label: 'Weight',
    cardLabel: 'Weight',
    unit: 'kg',
    color: '#60b4ff',
    goal: 'decrease',
    decimals: 1,
    goalLabel: 'Goal: decrease',
  },
  {
    key: 'smm',
    label: 'SMM',
    cardLabel: 'SMM',
    unit: 'kg',
    color: '#7bf1a8',
    goal: 'increase',
    decimals: 1,
    goalLabel: 'Goal: maintain or increase',
  },
  {
    key: 'pbf',
    label: 'PBF',
    cardLabel: 'PBF',
    unit: '%',
    color: '#ffcb6b',
    goal: 'decrease',
    decimals: 1,
    goalLabel: 'Goal: decrease',
  },
  {
    key: 'bodyFatMass',
    label: 'Body Fat Mass',
    cardLabel: 'Fat Mass',
    unit: 'kg',
    color: '#ff9b71',
    goal: 'decrease',
    decimals: 1,
    goalLabel: 'Goal: decrease',
  },
  {
    key: 'bmi',
    label: 'BMI',
    cardLabel: 'BMI',
    unit: 'kg/m²',
    color: '#b39dff',
    goal: 'decrease',
    decimals: 1,
    goalLabel: 'Goal: decrease',
  },
  {
    key: 'visceralFat',
    label: 'Visceral Fat',
    cardLabel: 'Visceral',
    unit: 'level',
    color: '#ff6b6b',
    goal: 'decrease',
    decimals: 0,
    goalLabel: 'Goal: decrease',
  },
];

const ALL_METRIC = {
  key: 'all',
  label: 'All',
  cardLabel: 'All',
  unit: 'metrics',
  color: '#c8f53f',
};

const DEMO_INBODY_RECORDS_BY_PHONE = {
  '0909113799': [
    {
      id: 'demo-cam-2025-04-16',
      measured_at: '2025-04-16T08:16:00+07:00',
      inbody_score: 76,
      weight_kg: 81.9,
      smm_kg: 34.7,
      pbf_pct: 25.3,
      body_fat_mass_kg: 20.7,
      bmi: 27.7,
      visceral_fat_level: 9,
    },
    {
      id: 'demo-cam-2026-01-30',
      measured_at: '2026-01-30T08:32:00+07:00',
      inbody_score: 76,
      weight_kg: 79.3,
      smm_kg: 34.2,
      pbf_pct: 24.1,
      body_fat_mass_kg: 19.1,
      bmi: 26.8,
      visceral_fat_level: 9,
    },
    {
      id: 'demo-cam-2026-02-27',
      measured_at: '2026-02-27T08:25:00+07:00',
      inbody_score: 76,
      weight_kg: 80.6,
      smm_kg: 34.6,
      pbf_pct: 24.7,
      body_fat_mass_kg: 19.9,
      bmi: 27.2,
      visceral_fat_level: 9,
    },
  ],
};

const formatMetricValue = (value, decimals = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return Number(value).toFixed(decimals);
};

const formatMetricDelta = (value, decimals = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(decimals)}`;
};

const formatDeltaMagnitude = (value, decimals = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(Math.abs(value)).toFixed(decimals);
};

const formatChartDate = (value) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(value));

const formatAxisDate = (value, includeYear = false) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  ...(includeYear ? { year: '2-digit' } : {}),
}).format(new Date(value));

const formatShortDate = (value, includeYear = false) => {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    ...(includeYear ? { year: '2-digit' } : {}),
  }).format(new Date(value));
};

const formatSessionDayLabel = (value) => new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
}).format(new Date(`${value}T00:00:00`));

const getPortalSessionLabel = (serviceType, sessionNumber) => {
  switch (serviceType) {
    case 'sketching':
      return `Sketching #${sessionNumber}`;
    case 'meal_prep':
      return `Meal Prep #${sessionNumber}`;
    case 'training':
    default:
      return `Workout #${sessionNumber}`;
  }
};

const formatDobDisplay = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const parseNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeGender = (value) => String(value || '').trim().toLowerCase();

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const trimZero = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  const rounded = Number(value);
  if (Number.isInteger(rounded)) return `${rounded}`;
  return rounded.toFixed(1).replace(/\.0$/, '');
};

const ZONE_STYLES = {
  under: {
    track: 'rgba(96,180,255,0.28)',
    needle: '#60b4ff',
    pillClassName: 'text-[#60b4ff]',
  },
  normal: {
    track: 'rgba(200,245,63,0.32)',
    needle: '#c8f53f',
    pillClassName: 'text-[#c8f53f]',
  },
  over: {
    track: 'rgba(255,160,80,0.28)',
    needle: '#ffaa55',
    pillClassName: 'text-[#ffaa55]',
  },
  high: {
    track: 'rgba(255,107,107,0.28)',
    needle: '#ff6b6b',
    pillClassName: 'text-[#ff6b6b]',
  },
};

const getMetricStandard = (metricKey, gender) => {
  const isFemale = normalizeGender(gender).startsWith('f');

  switch (metricKey) {
    case 'score':
      return {
        min: 0,
        max: 100,
        thresholds: [25, 50, 75],
        labels: ['Poor', 'Fair', 'Good', 'Excellent'],
        zoneKeys: ['high', 'over', 'normal', 'normal'],
      };
    case 'weight':
      return {
        min: 50,
        max: 110,
        thresholds: [65, 80, 95],
        labels: ['Under', 'Normal', 'Over', 'Obese'],
        zoneKeys: ['under', 'normal', 'over', 'high'],
      };
    case 'smm':
      return {
        min: 20,
        max: 50,
        thresholds: [29, 37, 43],
        labels: ['Under', 'Normal', 'High', 'Peak'],
        zoneKeys: ['under', 'normal', 'normal', 'normal'],
      };
    case 'pbf':
      return isFemale
        ? {
            min: 0,
            max: 50,
            thresholds: [21, 33, 39],
            labels: ['Under', 'Normal', 'Over', 'High'],
            zoneKeys: ['under', 'normal', 'over', 'high'],
          }
        : {
            min: 0,
            max: 40,
            thresholds: [8, 20, 25],
            labels: ['Under', 'Normal', 'Over', 'High'],
            zoneKeys: ['under', 'normal', 'over', 'high'],
          };
    case 'bodyFatMass':
      return isFemale
        ? {
            min: 5,
            max: 40,
            thresholds: [14, 24, 32],
            labels: ['Under', 'Normal', 'Over', 'High'],
            zoneKeys: ['under', 'normal', 'over', 'high'],
          }
        : {
            min: 5,
            max: 35,
            thresholds: [10, 18, 25],
            labels: ['Under', 'Normal', 'Over', 'High'],
            zoneKeys: ['under', 'normal', 'over', 'high'],
          };
    case 'bmi':
      return {
        min: 15,
        max: 40,
        thresholds: [18.5, 24.9, 30],
        labels: ['Under', 'Normal', 'Over', 'Obese'],
        zoneKeys: ['under', 'normal', 'over', 'high'],
      };
    case 'visceralFat':
      return {
        min: 1,
        max: 20,
        thresholds: [4, 9, 14],
        labels: ['Low', 'Normal', 'High', 'Very high'],
        zoneKeys: ['under', 'normal', 'over', 'high'],
      };
    default:
      return null;
  }
};

const getRangeZone = (standard, value) => {
  if (!standard || value === null || value === undefined || Number.isNaN(value)) return null;

  const [a, b, c] = standard.thresholds;
  let index = 0;

  if (value < a) index = 0;
  else if (value < b) index = 1;
  else if (value < c) index = 2;
  else index = 3;

  return {
    index,
    label: standard.labels[index],
    zoneKey: standard.zoneKeys[index],
  };
};

const getRangeSegments = (standard) => {
  if (!standard) return [];
  const edges = [standard.min, ...standard.thresholds, standard.max];
  return Array.from({ length: 4 }, (_, index) => {
    const start = edges[index];
    const end = edges[index + 1];
    const width = ((end - start) / (standard.max - standard.min)) * 100;
    return {
      width,
      label: standard.labels[index],
      zoneKey: standard.zoneKeys[index],
    };
  });
};

const getNeedlePercent = (standard, value) => {
  if (!standard || value === null || value === undefined || Number.isNaN(value)) return 2;
  return clamp(((value - standard.min) / (standard.max - standard.min)) * 100, 2, 98);
};

const getDeltaTone = (metricKey, delta) => {
  if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) {
    return 'text-white/35';
  }

  const isScore = metricKey === 'score';
  const isSmm = metricKey === 'smm';
  const isDecreaseMetric = ['weight', 'pbf', 'bodyFatMass', 'bmi', 'visceralFat'].includes(metricKey);

  if ((isScore || isSmm) && delta > 0) {
    return 'text-[#c8f53f]';
  }

  if (isDecreaseMetric && delta < 0) {
    return 'text-[#60b4ff]';
  }

  return 'text-[#ffaa55]';
};

const DeltaArrowIcon = ({ delta, className = '' }) => {
  if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) return null;
  const isUp = delta > 0;

  return (
    <svg viewBox="0 0 8 8" className={`h-2 w-2 ${isUp ? '' : 'rotate-180'} ${className}`} aria-hidden="true">
      <path d="M4 1 L7 6 H1 Z" fill="currentColor" />
    </svg>
  );
};

const ZonePill = ({ zone }) => {
  if (!zone) return null;
  const tone = ZONE_STYLES[zone.zoneKey] || ZONE_STYLES.normal;

  return (
    <span className={`inline-flex min-w-0 items-center text-[7px] font-black uppercase tracking-[0.06em] ${tone.pillClassName}`}>
      {zone.label}
    </span>
  );
};

const DeltaBadge = ({ metricKey, delta }) => {
  const tone = getDeltaTone(metricKey, delta);
  const isZero = delta === null || delta === undefined || Number.isNaN(delta) || delta === 0;

  return (
    <span className={`inline-flex min-w-0 items-center gap-1 text-[7px] font-black ${tone}`}>
      {!isZero ? <DeltaArrowIcon delta={delta} /> : null}
      <span>{isZero ? '0.0' : formatDeltaMagnitude(delta, metricKey === 'visceralFat' || metricKey === 'score' ? 0 : 1)}</span>
    </span>
  );
};

const RangeChart = ({ standard, value, decimals = 1 }) => {
  if (!standard) return null;

  const segments = getRangeSegments(standard);
  const zone = getRangeZone(standard, value);
  const needlePercent = getNeedlePercent(standard, value);
  const needleColor = zone ? (ZONE_STYLES[zone.zoneKey] || ZONE_STYLES.normal).needle : 'rgba(255,255,255,0.32)';
  const scaleValues = [standard.min, ...standard.thresholds, standard.max];

  return (
    <div className="mt-1 flex flex-col gap-[3px]">
      <div className="relative flex h-[2px] overflow-visible rounded-[2px]">
        {segments.map((segment, index) => {
          const tone = ZONE_STYLES[segment.zoneKey] || ZONE_STYLES.normal;

          return (
            <span
              key={`${segment.zoneKey}-${index}`}
              style={{ width: `${segment.width}%`, backgroundColor: tone.track }}
              className={`${index === 0 ? 'rounded-l-[3px]' : ''} ${index === segments.length - 1 ? 'rounded-r-[3px]' : ''}`}
            />
          );
        })}

        <span
          className="absolute top-[-2px] h-[7px] w-[2px] rounded-[1px]"
          style={{
            left: `${needlePercent}%`,
            transform: 'translateX(-50%)',
            backgroundColor: needleColor,
            boxShadow: `0 0 5px ${needleColor}90`,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[6px] font-bold text-white/20">
        {scaleValues.map((scaleValue) => (
          <span key={`${scaleValue}`}>{trimZero(scaleValue)}</span>
        ))}
      </div>
    </div>
  );
};

const BodyScoreRing = ({ score }) => {
  const safeScore = clamp(score ?? 0, 0, 100);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (safeScore / 100) * circumference;

  return (
    <svg viewBox="0 0 80 80" className="h-[52px] w-[52px] shrink-0">
      <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" />
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="#c8f53f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="39" textAnchor="middle" fill="#c8f53f" fontSize="14" fontWeight="300">
        {score !== null && score !== undefined && !Number.isNaN(score) ? Math.round(score) : '--'}
      </text>
      <text x="40" y="48" textAnchor="middle" fill="rgba(255,255,255,0.30)" fontSize="6" fontWeight="700">
        /100
      </text>
    </svg>
  );
};

const BodyScoreCard = ({ card, isActive, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full flex-col rounded-[14px] border px-2.5 py-[8px] pb-[7px] text-left transition-all"
      style={{
        background: isActive ? 'rgba(200,245,63,0.05)' : 'rgba(255,255,255,0.04)',
        borderColor: isActive ? 'rgba(200,245,63,0.22)' : 'rgba(255,255,255,0.07)',
      }}
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-[rgba(200,245,63,0.5)]">Your Body Score</p>

      <div className="mt-1 grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
        <BodyScoreRing score={card.score} />
        <div className="min-w-0 self-center">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <ZonePill zone={card.zone} />
            <DeltaBadge metricKey="score" delta={card.delta} />
          </div>
          <p className="mt-0.5 text-[7px] font-bold leading-none text-white/35">{card.scanInfo}</p>
        </div>
      </div>
    </button>
  );
};

const MetricUnit = ({ unit }) => {
  if (unit === 'kg/m²') {
    return (
      <span className="inline-flex flex-col items-center justify-end text-[8px] font-bold uppercase leading-none text-white/30">
        <span className="px-[1px]">KG</span>
        <span className="mt-[2px] h-px w-[16px] bg-white/28" aria-hidden="true" />
        <span className="mt-[2px] inline-flex items-start">
          <span>M</span>
          <sup className="text-[5px] leading-none">2</sup>
        </span>
      </span>
    );
  }

  return <span className="text-[9px] font-bold uppercase leading-[0.9] text-white/30">{unit}</span>;
};

const InBodyMetricCard = ({ card, isActive, onClick }) => {
  const tone = card.zone ? (ZONE_STYLES[card.zone.zoneKey] || ZONE_STYLES.normal) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[14px] border px-2.5 py-[8px] pb-[7px] text-left transition-all"
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderColor: isActive ? `${card.color}55` : tone ? tone.track.replace('0.28', '0.20').replace('0.32', '0.20') : 'rgba(255,255,255,0.07)',
      }}
    >
      <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/30">{card.cardLabel}</p>

      <div className="mt-1 flex items-end gap-1 leading-none">
        <p className="text-[23px] font-light leading-[0.9] text-white">{card.latestValue}</p>
        <MetricUnit unit={card.unit} />
      </div>

      <RangeChart standard={card.standard} value={card.numericValue} decimals={card.decimals} />

      <div className="mt-1 flex items-center justify-between gap-2 whitespace-nowrap">
        <ZonePill zone={card.zone} />
        <DeltaBadge metricKey={card.key} delta={card.delta} />
      </div>
    </button>
  );
};

const getMetricGoalTone = (metric, delta) => {
  if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) {
    return {
      textClassName: 'text-white/45',
      badgeClassName: 'border-white/[0.08] bg-white/[0.04] text-white/45',
    };
  }

  const isImproving = metric.goal === 'increase' ? delta > 0 : delta < 0;
  return isImproving
    ? {
        textClassName: 'text-emerald-300',
        badgeClassName: 'border-emerald-500/20 bg-emerald-500/12 text-emerald-300',
      }
    : {
        textClassName: 'text-red-300',
        badgeClassName: 'border-red-500/20 bg-red-500/12 text-red-300',
      };
};

const getLastTwoValues = (records, key) => {
  const valid = records
    .map((record) => record[key])
    .filter((value) => value !== null && value !== undefined && !Number.isNaN(value));

  if (valid.length === 0) return { latest: null, previous: null };
  if (valid.length === 1) return { latest: valid[0], previous: null };

  return {
    latest: valid[valid.length - 1],
    previous: valid[valid.length - 2],
  };
};

const buildLineSegments = (points) => {
  const segments = [];
  let current = [];

  points.forEach((point) => {
    if (point.value === null || point.value === undefined || Number.isNaN(point.value)) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }

    current.push(point);
  });

  if (current.length > 0) segments.push(current);
  return segments;
};

const buildSvgPath = (segment) => segment
  .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
  .join(' ');

const buildAreaPath = (segment, bottomY) => {
  if (segment.length === 0) return '';
  const linePath = buildSvgPath(segment);
  const first = segment[0];
  const last = segment[segment.length - 1];

  return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
};

const DeltaTriangle = ({ delta }) => {
  if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) {
    return <span className="text-[9px] leading-none">•</span>;
  }

  const isUp = delta > 0;

  return (
    <svg
      viewBox="0 0 10 10"
      className={`h-2.5 w-2.5 shrink-0 ${isUp ? '' : 'rotate-180'}`}
      aria-hidden="true"
    >
      <path d="M5 1 L9 8 H1 Z" fill="currentColor" />
    </svg>
  );
};

const InBodyProgressChart = ({ records, selectedMetricKey, activeIndex, onActiveIndexChange }) => {
  const width = 320;
  const height = 112;
  const padding = { top: 10, right: 10, bottom: 18, left: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const chartBottom = padding.top + plotHeight;
  const selectedMetric = INBODY_METRICS.find((metric) => metric.key === selectedMetricKey) || null;
  const isAllView = selectedMetricKey === 'all';
  const sortedRecords = useMemo(
    () => [...records].sort((left, right) => new Date(left.measuredAt) - new Date(right.measuredAt)),
    [records],
  );
  const chartRef = useRef(null);
  const shouldShowYear = useMemo(() => {
    const years = new Set(sortedRecords.map((record) => new Date(record.measuredAt).getFullYear()));
    return years.size > 1;
  }, [sortedRecords]);

  const xPositions = sortedRecords.map((record, index) => {
    if (sortedRecords.length === 1) return padding.left + plotWidth / 2;
    return padding.left + (plotWidth * index) / (sortedRecords.length - 1);
  });

  const metricsForChart = isAllView ? INBODY_METRICS : [selectedMetric].filter(Boolean);

  const scales = metricsForChart.reduce((acc, metric) => {
    const values = sortedRecords
      .map((record) => record[metric.key])
      .filter((value) => value !== null && value !== undefined && !Number.isNaN(value));

    if (values.length === 0) {
      acc[metric.key] = { min: 0, max: 100 };
      return acc;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (isAllView) {
      acc[metric.key] = { min, max };
      return acc;
    }

    const spread = max - min;
    const paddingValue = spread === 0 ? Math.max(Math.abs(max) * 0.12, 1) : spread * 0.18;
    acc[metric.key] = { min: min - paddingValue, max: max + paddingValue };
    return acc;
  }, {});

  const getY = (metricKey, value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return null;

    if (isAllView) {
      const { min, max } = scales[metricKey];
      if (max === min) return padding.top + plotHeight / 2;
      const normalized = ((value - min) / (max - min)) * 100;
      return padding.top + (1 - normalized / 100) * plotHeight;
    }

    const { min, max } = scales[metricKey];
    if (max === min) return padding.top + plotHeight / 2;
    return padding.top + (1 - (value - min) / (max - min)) * plotHeight;
  };

  const series = metricsForChart.map((metric) => {
    const points = sortedRecords.map((record, index) => ({
      index,
      x: xPositions[index],
      y: getY(metric.key, record[metric.key]),
      value: record[metric.key],
    }));

    return {
      metric,
      points,
      segments: buildLineSegments(points),
    };
  });

  const tickValues = isAllView
    ? [0, 25, 50, 75, 100]
    : (() => {
        if (!selectedMetric) return [0, 25, 50, 75, 100];
        const { min, max } = scales[selectedMetric.key];
        return Array.from({ length: 4 }, (_, index) => min + ((max - min) * index) / 3);
      })();

  const selectedRecord = sortedRecords[activeIndex] || null;

  useEffect(() => {
    if (activeIndex === null) return undefined;

    const handlePointerDown = (event) => {
      if (!chartRef.current?.contains(event.target)) {
        onActiveIndexChange(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [activeIndex, onActiveIndexChange]);

  return (
    <div ref={chartRef} className="relative rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-3 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/28">
            {isAllView ? 'Normalized trends' : selectedMetric?.label}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-white/72">
            {isAllView ? 'Visual comparison only. Tooltip always shows real values.' : selectedMetric?.goalLabel}
          </p>
        </div>
        {!isAllView && selectedMetric ? (
          <div
            className="rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wide"
            style={{
              color: selectedMetric.color,
              borderColor: `${selectedMetric.color}33`,
              background: `${selectedMetric.color}12`,
            }}
          >
            {selectedMetric.goalLabel}
          </div>
        ) : null}
      </div>

      <div className="relative">
        {selectedRecord ? (
          <div
            className="absolute z-20 min-w-[170px] max-w-[210px] rounded-[16px] border border-white/[0.08] bg-[rgba(8,14,25,0.96)] px-3 py-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
            style={{
              left: `${Math.min(Math.max(((xPositions[activeIndex] / width) * 100), 18), 82)}%`,
              top: '4px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/35">{formatChartDate(selectedRecord.measuredAt)}</p>
              <button
                type="button"
                onClick={() => onActiveIndexChange(null)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.05] text-white/45 transition-all active:scale-95"
                aria-label="Close chart details"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-1.5 space-y-1">
              {(isAllView ? INBODY_METRICS : [selectedMetric]).filter(Boolean).map((metric) => {
                const current = selectedRecord[metric.key];
                if (current === null || current === undefined || Number.isNaN(current)) return null;

                const previousValue = (() => {
                  for (let index = activeIndex - 1; index >= 0; index -= 1) {
                    const value = sortedRecords[index][metric.key];
                    if (value !== null && value !== undefined && !Number.isNaN(value)) return value;
                  }
                  return null;
                })();

                const delta = previousValue === null ? null : current - previousValue;
                const tone = getMetricGoalTone(metric, delta);

                return (
                  <div key={metric.key} className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="font-semibold" style={{ color: metric.color }}>{metric.label}</span>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {formatMetricValue(current, metric.decimals)} {metric.unit}
                      </p>
                      {delta !== null ? (
                        <p className={`text-[9px] font-black uppercase tracking-wide ${tone.textClassName}`}>
                          {formatMetricDelta(delta, metric.decimals)} {metric.unit}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <svg viewBox={`0 0 ${width} ${height}`} className="h-[112px] w-full overflow-visible">
          {tickValues.map((tickValue, index) => {
            const y = padding.top + (plotHeight * index) / (tickValues.length - 1);
            const label = isAllView ? `${Math.round(100 - ((index * 100) / (tickValues.length - 1)))}%` : formatMetricValue(tickValues[tickValues.length - 1 - index], selectedMetric?.decimals ?? 1);

            return (
              <g key={`${tickValue}-${index}`}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 6" />
                <text x={padding.left - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.24)" fontSize="7" fontWeight="700">
                  {label}
                </text>
              </g>
            );
          })}

          {series.map(({ metric, segments }) => (
            <g key={metric.key}>
              {!isAllView && segments.map((segment, index) => (
                <path
                  key={`${metric.key}-area-${index}`}
                  d={buildAreaPath(segment, chartBottom)}
                  fill={`url(#${metric.key}-gradient)`}
                  opacity="0.95"
                />
              ))}

              {segments.map((segment, index) => (
                <path
                  key={`${metric.key}-line-${index}`}
                  d={buildSvgPath(segment)}
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>
          ))}

          {series.map(({ metric, points }) => (
            <g key={`${metric.key}-points`}>
              {points.map((point) => (
                point.y !== null ? (
                <circle
                  key={`${metric.key}-${point.index}`}
                  cx={point.x}
                  cy={point.y}
                    r={activeIndex === point.index ? 3.2 : 2.2}
                    fill={metric.color}
                    stroke="rgba(10,16,26,0.95)"
                    strokeWidth="1.2"
                  />
                ) : null
              ))}
            </g>
          ))}

          {sortedRecords.map((record, index) => {
            const prevX = index === 0 ? padding.left : (xPositions[index - 1] + xPositions[index]) / 2;
            const nextX = index === sortedRecords.length - 1 ? width - padding.right : (xPositions[index] + xPositions[index + 1]) / 2;

            return (
              <rect
                key={`zone-${record.measuredAt}-${index}`}
                x={prevX}
                y={padding.top}
                width={Math.max(nextX - prevX, 20)}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => onActiveIndexChange(index)}
                onClick={() => onActiveIndexChange(activeIndex === index ? null : index)}
              />
            );
          })}

          {sortedRecords.map((record, index) => {
            if (!(index === 0 || index === sortedRecords.length - 1 || index === Math.floor(sortedRecords.length / 2))) return null;

            return (
              <text
                key={`label-${record.measuredAt}`}
                x={xPositions[index]}
                y={height - 5}
                textAnchor={index === 0 ? 'start' : index === sortedRecords.length - 1 ? 'end' : 'middle'}
                fill="rgba(255,255,255,0.28)"
                fontSize="7"
                fontWeight="700"
              >
                {formatAxisDate(record.measuredAt, shouldShowYear)}
              </text>
            );
          })}

          <defs>
            {INBODY_METRICS.map((metric) => (
              <linearGradient key={metric.key} id={`${metric.key}-gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.color} stopOpacity="0.34" />
                <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
        </svg>
      </div>
    </div>
  );
};

const ProfileTab = ({ client, onRegisterActions, readOnly = false }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingInbody, setIsSavingInbody] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [inbodyRecords, setInbodyRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progressPhotos, setProgressPhotos] = useState({ before: null, after: null });
  const [newInbodyRecord, setNewInbodyRecord] = useState({
    weight: '',
    muscle_mass: '',
    body_fat: '',
    body_fat_mass: '',
    bmi: '',
    visceral_fat: '',
    recorded_at: '',
  });
  const [uploadError, setUploadError] = useState('');
  const [isUploadingProgress, setIsUploadingProgress] = useState(false);
  const [selectedMetricKey, setSelectedMetricKey] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [activeChartIndex, setActiveChartIndex] = useState(null);
  const [upcomingSchedule, setUpcomingSchedule] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(client.avatar_url || client.avatar || '');
  const [editData, setEditData] = useState({
    name: client.name || '',
    phone: client.phone || '',
    dob: client.dob || '',
    gender: client.gender || '',
    height: client.height || '',
    weight: client.weight || '',
    goal: client.goal || '',
    targetduration: client.targetduration || '',
    traininghistory: client.traininghistory || '',
    trainingtime: client.trainingtime || '',
    jobtype: client.jobtype || '',
    sleephabits: client.sleephabits || '',
  });

  const progressSectionRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    setAvatarUrl(client.avatar_url || client.avatar || '');
  }, [client.avatar, client.avatar_url]);

  const fetchUpcomingSchedule = useCallback(async () => {
    if (!readOnly || !client.id) {
      setUpcomingSchedule([]);
      return;
    }

    const { data: sessionRows, error: sessionError } = await supabase
      .from('sessions')
      .select('id, package_id, session_number, scheduled_date, scheduled_time, status, notes')
      .eq('client_id', client.id)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .limit(3);

    if (sessionError) {
      console.error('Upcoming schedule load error:', sessionError.message);
      setUpcomingSchedule([]);
      return;
    }

    const packageIds = Array.from(new Set((sessionRows || []).map((item) => item.package_id).filter(Boolean)));
    let packageMetaMap = {};

    if (packageIds.length > 0) {
      const { data: packageRows, error: packageError } = await supabase
        .from('packages')
        .select('id, note')
        .in('id', packageIds);

      if (packageError) {
        console.error('Upcoming schedule package load error:', packageError.message);
      } else {
        packageMetaMap = (packageRows || []).reduce((acc, item) => {
          acc[item.id] = parseServiceMeta(item.note);
          return acc;
        }, {});
      }
    }

    const normalized = (sessionRows || []).map((item) => {
      const packageMeta = packageMetaMap[item.package_id] || {};
      const bookingMeta = parseServiceBooking(item.notes);
      return {
        id: item.id,
        label: getPortalSessionLabel(packageMeta.serviceType || 'training', item.session_number ?? '--'),
        dayLabel: formatSessionDayLabel(item.scheduled_date),
        timeLabel: bookingMeta.endTime
          ? `${item.scheduled_time?.slice(0, 5)} - ${bookingMeta.endTime}`
          : item.scheduled_time?.slice(0, 5) || '--:--',
        location: bookingMeta.location || '',
        status: item.status,
      };
    });

    setUpcomingSchedule(normalized);
  }, [client.id, readOnly]);

  const fetchInBody = useCallback(async () => {
    const { data } = await supabase
      .from('inbody_records')
      .select('*')
      .eq('client_id', client.id)
      .order('recorded_at', { ascending: true });

    if (data) setInbodyRecords(data);
  }, [client.id]);

  const fetchProgressPhotos = useCallback(async () => {
    const beforeFileName = `client-${client.id}-before`;
    const afterFileName = `client-${client.id}-after`;

    try {
      const { data: beforeUrl } = supabase.storage.from('client-progress').getPublicUrl(beforeFileName);
      setProgressPhotos((prev) => ({ ...prev, before: beforeUrl.publicUrl }));
    } catch (err) {
      console.error('[Progress Photo] Before fetch error:', err);
    }

    try {
      const { data: afterUrl } = supabase.storage.from('client-progress').getPublicUrl(afterFileName);
      setProgressPhotos((prev) => ({ ...prev, after: afterUrl.publicUrl }));
    } catch (err) {
      console.error('[Progress Photo] After fetch error:', err);
    }
  }, [client.id]);

  useEffect(() => {
    fetchInBody();
    fetchProgressPhotos();
    void fetchUpcomingSchedule();
  }, [fetchInBody, fetchProgressPhotos, fetchUpcomingSchedule]);

  useEffect(() => {
    if (readOnly || !onRegisterActions) return undefined;

    onRegisterActions({
      openEdit: () => setIsEditMode(true),
      openInbody: () => setIsModalOpen(true),
      openPhotos: () => {
        progressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    });

    return () => onRegisterActions(null);
  }, [onRegisterActions, readOnly]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const fileName = `client-${client.id}-avatar`;
      const { error: avatarError } = await supabase.storage.from('client-avatars').upload(fileName, file, { upsert: true });

      if (avatarError) throw avatarError;

      const { data } = supabase.storage.from('client-avatars').getPublicUrl(fileName);
      const versionedAvatarUrl = `${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
      const { error: updateError } = await supabase.from('clients').update({ avatar_url: versionedAvatarUrl }).eq('id', client.id);

      if (updateError) throw updateError;

      setAvatarUrl(versionedAvatarUrl);
      alert('Avatar updated successfully.');
    } catch (err) {
      alert('Avatar upload failed: ' + err.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSavingProfile(true);

    const { error } = await supabase.from('clients').update({
      ...editData,
      dob: editData.dob || null,
    }).eq('id', client.id);

    if (!error) {
      setIsEditMode(false);
      alert('Profile updated successfully.');
      window.location.reload();
    } else {
      alert('Error: ' + error.message);
    }

    setIsSavingProfile(false);
  };

  const handleProgressPhotoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProgress(true);
    setUploadError('');

    try {
      const fileName = `client-${client.id}-${type}`;
      const { error } = await supabase.storage.from('client-progress').upload(fileName, file, { upsert: true });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      await fetchProgressPhotos();
    } catch (err) {
      setUploadError(`Upload failed: ${err.message}`);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingProgress(false);
    }
  };

  const handleSaveInBody = async () => {
    if (!newInbodyRecord.weight) {
      alert('Weight is required.');
      return;
    }

    setIsSavingInbody(true);

    const weight = parseNullableNumber(newInbodyRecord.weight);
    const smm = parseNullableNumber(newInbodyRecord.muscle_mass);
    const pbf = parseNullableNumber(newInbodyRecord.body_fat);
    const visceralFat = parseNullableNumber(newInbodyRecord.visceral_fat);
    const measuredAt = newInbodyRecord.recorded_at ? new Date(newInbodyRecord.recorded_at).toISOString() : new Date().toISOString();
    const fallbackHeightCm = client.height ? parseFloat(client.height) : null;
    const derivedBmi = weight && fallbackHeightCm ? weight / ((fallbackHeightCm / 100) ** 2) : null;
    const derivedBodyFatMass = weight !== null && pbf !== null ? (weight * pbf) / 100 : null;
    const bmi = parseNullableNumber(newInbodyRecord.bmi) ?? derivedBmi;
    const bodyFatMass = parseNullableNumber(newInbodyRecord.body_fat_mass) ?? derivedBodyFatMass;

    const insertVariants = [
      {
        client_id: client.id,
        weight,
        weight_kg: weight,
        muscle_mass: smm,
        smm_kg: smm,
        body_fat: pbf,
        pbf_pct: pbf,
        body_fat_mass: bodyFatMass,
        body_fat_mass_kg: bodyFatMass,
        bmi,
        visceral_fat: visceralFat,
        visceral_fat_level: visceralFat,
        recorded_at: measuredAt,
        measured_at: measuredAt,
      },
      {
        client_id: client.id,
        weight,
        muscle_mass: smm,
        body_fat: pbf,
        body_fat_mass: bodyFatMass,
        bmi,
        visceral_fat: visceralFat,
        recorded_at: measuredAt,
      },
      {
        client_id: client.id,
        weight,
        muscle_mass: smm,
        body_fat: pbf,
        visceral_fat: visceralFat,
        recorded_at: measuredAt,
      },
    ];

    let error = null;
    for (const payload of insertVariants) {
      const response = await supabase.from('inbody_records').insert([payload]);
      error = response.error;
      if (!error) break;
    }

    if (!error) {
      await fetchInBody();
      setIsModalOpen(false);
      setNewInbodyRecord({
        weight: '',
        muscle_mass: '',
        body_fat: '',
        body_fat_mass: '',
        bmi: '',
        visceral_fat: '',
        recorded_at: '',
      });
    } else {
      alert('Error: ' + error.message);
    }

    setIsSavingInbody(false);
  };

  const chartRecords = useMemo(() => {
    const fallbackHeightCm = client.height ? parseFloat(client.height) : null;
    const phoneKey = String(client.phone || '').replace(/\D/g, '');
    const demoRecords = DEMO_INBODY_RECORDS_BY_PHONE[phoneKey] || [];
    const mergedRecords = [...inbodyRecords];

    demoRecords.forEach((demoRecord) => {
      const demoTimestamp = demoRecord.measured_at;
      const hasSameMeasurement = mergedRecords.some((record) => {
        const recordedAt = record.recorded_at ?? record.measured_at;
        return recordedAt && new Date(recordedAt).toISOString() === new Date(demoTimestamp).toISOString();
      });

      if (!hasSameMeasurement) {
        mergedRecords.push(demoRecord);
      }
    });

    return mergedRecords.map((record) => {
      const weight = record.weight ?? record.weight_kg ?? null;
      const smm = record.muscle_mass ?? record.smm ?? record.smm_kg ?? null;
      const pbf = record.body_fat ?? record.pbf ?? record.pbf_pct ?? null;
      const visceralFat = record.visceral_fat ?? record.visceral_fat_level ?? null;
      const inbodyScore = record.inbody_score ?? record.inbodyScore ?? null;
      const bmi = record.bmi ?? (weight && fallbackHeightCm ? weight / ((fallbackHeightCm / 100) ** 2) : null);
      const bodyFatMass = record.body_fat_mass
        ?? record.body_fat_mass_kg
        ?? (weight !== null && pbf !== null ? (weight * pbf) / 100 : null);

      return {
        id: record.id ?? record.recorded_at,
        measuredAt: record.recorded_at ?? record.measured_at,
        weight,
        smm,
        pbf,
        bodyFatMass,
        bmi,
        visceralFat,
        inbodyScore,
      };
    }).filter((record) => record.measuredAt)
      .sort((left, right) => new Date(left.measuredAt) - new Date(right.measuredAt));
  }, [client.height, inbodyRecords]);

  const filteredChartRecords = useMemo(() => {
    const selectedFilter = TIME_FILTER_OPTIONS.find((option) => option.id === timeFilter);
    if (!selectedFilter || selectedFilter.months === null) return chartRecords;
    if (chartRecords.length === 0) return [];

    const latestDate = new Date(chartRecords[chartRecords.length - 1].measuredAt);
    const threshold = new Date(latestDate);
    threshold.setMonth(threshold.getMonth() - selectedFilter.months);

    return chartRecords.filter((record) => new Date(record.measuredAt) >= threshold);
  }, [chartRecords, timeFilter]);
  const chartSpansMultipleYears = useMemo(() => {
    const years = new Set(filteredChartRecords.map((record) => new Date(record.measuredAt).getFullYear()));
    return years.size > 1;
  }, [filteredChartRecords]);

  // Tooltip is only opened on user tap — no auto-open on data change
  useEffect(() => {
    setActiveChartIndex(null);
  }, [timeFilter, selectedMetricKey]);

  const inbodyCardData = useMemo(() => {
    const latestMeasurementDate = filteredChartRecords.length > 0
      ? formatShortDate(filteredChartRecords[filteredChartRecords.length - 1].measuredAt, chartSpansMultipleYears)
      : null;
    const latestRecord = filteredChartRecords[filteredChartRecords.length - 1] ?? null;
    const latestScore = latestRecord?.inbodyScore ?? null;
    const { latest: scoreLatest, previous: scorePrevious } = getLastTwoValues(filteredChartRecords, 'inbodyScore');
    const bodyScoreCard = {
      key: 'all',
      score: scoreLatest,
      delta: scoreLatest !== null && scorePrevious !== null ? scoreLatest - scorePrevious : 0,
      standard: getMetricStandard('score', client.gender),
      zone: getRangeZone(getMetricStandard('score', client.gender), scoreLatest),
      scanInfo: filteredChartRecords.length > 0
        ? `${filteredChartRecords.length} scans · ${latestMeasurementDate || '--/--'}`
        : 'No scans yet',
    };

    const metricSummaries = INBODY_METRICS.map((metric) => {
      const { latest, previous } = getLastTwoValues(filteredChartRecords, metric.key);
      const standard = getMetricStandard(metric.key, client.gender);

      return {
        ...metric,
        numericValue: latest,
        latestValue: formatMetricValue(latest, metric.decimals),
        delta: latest !== null && previous !== null ? latest - previous : null,
        standard,
        zone: getRangeZone(standard, latest),
      };
    });

    return {
      bodyScoreCard,
      metrics: metricSummaries,
    };
  }, [chartSpansMultipleYears, client.gender, client.height, filteredChartRecords]);

  const metricCardMap = useMemo(
    () => Object.fromEntries(inbodyCardData.metrics.map((metric) => [metric.key, metric])),
    [inbodyCardData.metrics],
  );

  const personalInfoCells = [
    { label: 'DATE OF BIRTH', value: formatDobDisplay(client.dob) },
    { label: 'GENDER', value: client.gender || '--' },
    { label: 'HEIGHT CM', value: client.height ? `${client.height} cm` : '--' },
    { label: 'WEIGHT KG', value: client.weight ? `${client.weight} kg` : '--' },
    { label: 'JOB', value: client.jobtype || '--' },
    { label: 'SLEEP', value: client.sleephabits || '--' },
    { label: 'TRAINING HISTORY', value: client.traininghistory || '--' },
    { label: 'TARGET TIME', value: client.targetduration || '--' },
  ];

  if (isEditMode) {
    return (
      <div className="relative isolate space-y-5 pb-6 pt-5 animate-slide-up">
        <div className="pointer-events-none absolute left-1/2 top-0 h-36 w-36 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="text-center">
          <p className="text-sm font-bold text-white">{editData.name || client.name}</p>
          <p className="mt-1 text-[10px] font-medium text-neutral-600">{editData.phone || 'No phone number yet'}</p>
        </div>

        <div className="space-y-3">
          <p className="app-label text-[9px] font-black uppercase tracking-widest">Avatar</p>
          <div className="overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
            <label className="flex cursor-pointer flex-col items-center gap-4 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-blue-500/15 shadow-lg shadow-blue-500/10">
                {isUploadingAvatar ? (
                  <RefreshCw className="h-6 w-6 animate-spin text-white/40" />
                ) : (
                  <ClientAvatar
                    name={editData.name || client.name}
                    avatarUrl={avatarUrl}
                    sizeClassName="h-24 w-24"
                    showInnerRing={true}
                    className="absolute inset-0"
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Update Avatar</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">TAP TO UPLOAD A NEW PHOTO</p>
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploadingAvatar} />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="app-label text-[9px] font-black uppercase tracking-widest">Personal Information</p>
          <div className="space-y-3 overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
            <EditableField label="Trainee Name" value={editData.name} onChange={(value) => setEditData({ ...editData, name: value })} />
            <EditableField label="Phone Number" value={editData.phone} onChange={(value) => setEditData({ ...editData, phone: value })} />
            <div className="grid grid-cols-2 gap-3">
              <EditableField label="Date of Birth" value={editData.dob} onChange={(value) => setEditData({ ...editData, dob: value })} type="date" />
              <EditableField label="Gender" value={editData.gender} onChange={(value) => setEditData({ ...editData, gender: value })} />
              <EditableField label="Height (cm)" value={editData.height} onChange={(value) => setEditData({ ...editData, height: value })} type="number" />
              <EditableField label="Weight (kg)" value={editData.weight} onChange={(value) => setEditData({ ...editData, weight: value })} type="number" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="app-label text-[9px] font-black uppercase tracking-widest">Goals & Lifestyle</p>
          <div className="space-y-3 overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
            <EditableField label="Goal" value={editData.goal} onChange={(value) => setEditData({ ...editData, goal: value })} />
            <EditableField label="Target Duration" value={editData.targetduration} onChange={(value) => setEditData({ ...editData, targetduration: value })} />
            <EditableField label="Training History" value={editData.traininghistory} onChange={(value) => setEditData({ ...editData, traininghistory: value })} />
            <EditableField label="Daily Duration" value={editData.trainingtime} onChange={(value) => setEditData({ ...editData, trainingtime: value })} />
            <div className="grid grid-cols-2 gap-3">
              <EditableField label="Job" value={editData.jobtype} onChange={(value) => setEditData({ ...editData, jobtype: value })} />
              <EditableField label="Sleep" value={editData.sleephabits} onChange={(value) => setEditData({ ...editData, sleephabits: value })} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => setIsEditMode(false)}
            className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-white/[0.08] bg-white/[0.04] py-3.5 px-5 text-sm font-bold text-white transition-all active:scale-95 shadow-lg shadow-black/20"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={isSavingProfile}
            className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-blue-500/20 bg-blue-500/10 py-3.5 px-5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/10"
          >
            {isSavingProfile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate pb-6 pt-5 animate-slide-up lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
      <div className="pointer-events-none absolute left-1/2 top-2 h-40 w-40 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl lg:hidden" />
      <div className="pointer-events-none absolute right-2 top-48 h-28 w-28 rounded-full bg-emerald-500/[0.08] blur-3xl lg:hidden" />

      {/* --- CỘT TRÁI (Avatar, Schedule, InBody) --- */}
      <div className="space-y-5 flex flex-col w-full">
      <div className="relative text-center">
        <div className="relative mx-auto w-fit">
          <ClientAvatar
            name={client.name}
            avatarUrl={avatarUrl}
            sizeClassName="mx-auto h-24 w-24"
            showInnerRing={true}
            ringClassName="border border-white/10 bg-blue-500/15 shadow-xl shadow-blue-500/10"
          />
          {readOnly && (
            <>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isUploadingAvatar}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white shadow-lg shadow-black/30 transition-all active:scale-95 disabled:opacity-60"
                aria-label="Change avatar"
              >
                {isUploadingAvatar ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          )}
        </div>
        <p className="mt-4 text-sm font-bold text-white">{client.name}</p>
        <p className="mt-1 text-[10px] font-medium text-neutral-600">{client.phone || 'No phone number yet'}</p>
        <div className="mt-3 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 shadow-lg shadow-blue-500/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-300">{client.goal || 'NO GOAL YET'}</span>
        </div>
        {readOnly ? (
          <p className="mt-2 text-[10px] text-white/38">{isUploadingAvatar ? 'Uploading avatar...' : 'Tap the camera icon to update your avatar.'}</p>
        ) : null}
      </div>

      {readOnly ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-label text-[9px] font-black uppercase tracking-widest">Upcoming Schedule</p>
              <p className="mt-1 text-[11px] text-white/45">Your next booked sessions and appointments.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] shadow-xl shadow-black/20 backdrop-blur-sm">
            {upcomingSchedule.length > 0 ? (
              upcomingSchedule.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-4 py-3 ${index !== upcomingSchedule.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                >
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.status === 'in_progress' ? 'bg-blue-400' : 'bg-[var(--app-accent)]'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-white">{item.label}</p>
                    <p className="mt-1 text-[10px] font-semibold text-white/42">{item.dayLabel} · {item.timeLabel}</p>
                    {item.location ? (
                      <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-white/35">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                    item.status === 'in_progress'
                      ? 'border border-blue-500/20 bg-blue-500/10 text-blue-300'
                      : 'border border-white/[0.07] bg-white/[0.04] text-white/35'
                  }`}>
                    {item.status === 'in_progress' ? 'Live' : 'Booked'}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-center">
                <CalendarDays className="mx-auto h-5 w-5 text-white/18" />
                <p className="mt-3 text-sm font-semibold text-white">No upcoming sessions yet</p>
                <p className="mt-1 text-[11px] text-white/42">Your coach will add the next booking here.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

        <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="app-label text-[9px] font-black uppercase tracking-widest">InBody Progress</p>
            <p className="mt-1 text-[11px] text-white/45">Track body composition trends over time.</p>
          </div>
          {!readOnly && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-[16px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wide text-white transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Add InBody
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <BodyScoreCard
              card={inbodyCardData.bodyScoreCard}
              isActive={selectedMetricKey === 'all'}
              onClick={() => setSelectedMetricKey('all')}
            />
            {['weight', 'smm'].map((key) => (
              <InBodyMetricCard
                key={key}
                card={metricCardMap[key]}
                isActive={selectedMetricKey === key}
                onClick={() => setSelectedMetricKey(key)}
              />
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {['pbf', 'bodyFatMass', 'bmi', 'visceralFat'].map((key) => (
              <InBodyMetricCard
                key={key}
                card={metricCardMap[key]}
                isActive={selectedMetricKey === key}
                onClick={() => setSelectedMetricKey(key)}
              />
            ))}
          </div>
        </div>

        <div className="grid w-full grid-cols-6 gap-1.5 rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-1.5">
          {TIME_FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTimeFilter(option.id)}
              aria-label={option.label}
              className={`rounded-[12px] px-1 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] transition-all ${
                timeFilter === option.id
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-white/[0.02] text-white/35'
              }`}
            >
              {option.shortLabel ?? option.label}
            </button>
          ))}
        </div>

        {filteredChartRecords.length > 0 ? (
          <InBodyProgressChart
            records={filteredChartRecords}
            selectedMetricKey={selectedMetricKey}
            activeIndex={activeChartIndex}
            onActiveIndexChange={setActiveChartIndex}
          />
        ) : (
          <div className="rounded-[24px] border border-white/[0.05] bg-white/[0.02] px-5 py-8 text-center shadow-xl shadow-black/20">
            <p className="text-sm font-semibold text-white">No InBody data in this range yet</p>
            <p className="mt-2 text-[11px] text-white/45">Add a new measurement to start visualizing progress trends.</p>
          </div>
        )}
      </div>

      </div>

      {/* --- CỘT PHẢI (Personal Info, Photos) --- */}
      <div className="space-y-5 flex flex-col w-full">
        <div className="space-y-3">
        <p className="app-label text-[9px] font-black uppercase tracking-widest">Personal Information</p>
        <div className="relative overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] shadow-xl shadow-black/20 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/[0.03] to-transparent" />
          <div className="grid grid-cols-2">
            {personalInfoCells.map((item, index) => (
              <InfoCell
                key={item.label}
                label={item.label}
                value={item.value}
                className={`${index % 2 === 0 ? 'border-r border-white/[0.05]' : ''} ${
                  index < personalInfoCells.length - 2 ? 'border-b border-white/[0.05]' : ''
                }`}
              />
            ))}

            <InfoCell
              label="DAILY DURATION"
              value={client.trainingtime || '--'}
              valueClassName="text-[11px] font-semibold text-blue-400"
              className="col-span-2 border-t border-white/[0.05]"
            />
          </div>
        </div>
          <div ref={progressSectionRef} className="space-y-3">
        <p className="app-label text-[9px] font-black uppercase tracking-widest">Progress Photos</p>

        {uploadError && (
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[11px] font-medium text-red-400">{uploadError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {[
            { type: 'before', label: 'BEFORE', src: progressPhotos.before },
            { type: 'after', label: 'AFTER', src: progressPhotos.after },
          ].map((photo) => {
            const Wrapper = readOnly ? 'div' : 'label';

            return (
            <Wrapper
              key={photo.type}
              className={`block ${readOnly ? '' : 'cursor-pointer'}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] border border-white/[0.05] bg-white/[0.02] shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute left-3 top-3 z-10 text-[9px] font-black uppercase tracking-widest text-neutral-700">
                  {photo.label}
                </span>

                {isUploadingProgress ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <RefreshCw className="mb-3 h-6 w-6 animate-spin text-white/30" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Uploading</p>
                  </div>
                ) : photo.src ? (
                  <img src={photo.src} alt={photo.label.toLowerCase()} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Camera className="mb-3 h-6 w-6 text-neutral-600" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-700">{photo.label}</p>
                  </div>
                )}
              </div>
              {!readOnly && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleProgressPhotoUpload(e, photo.type)}
                  className="hidden"
                  disabled={isUploadingProgress}
                />
              )}
            </Wrapper>
          )})}
        </div>
      </div>

      </div>
    </div>

      {!readOnly && isModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/60 px-4 pb-10 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-[32px] border border-white/10 bg-[#1a1a1c] p-6 shadow-2xl animate-slide-up">
            <h3 className="mb-6 text-sm font-bold text-white">Add InBody Record</h3>

            <div className="mb-6 space-y-3">
              {[
                { label: 'Measurement Date', key: 'recorded_at', type: 'date' },
                { label: 'Weight (kg)', key: 'weight' },
                { label: 'SMM (kg)', key: 'muscle_mass' },
                { label: 'PBF (%)', key: 'body_fat' },
                { label: 'Body Fat Mass (kg)', key: 'body_fat_mass' },
                { label: 'BMI (kg/m²)', key: 'bmi' },
                { label: 'Visceral Fat Level', key: 'visceral_fat' },
              ].map((field) => (
                <input
                  key={field.key}
                  type={field.type || 'number'}
                  placeholder={field.label}
                  value={newInbodyRecord[field.key]}
                  onChange={(e) => setNewInbodyRecord({ ...newInbodyRecord, [field.key]: e.target.value })}
                  className="w-full rounded-[12px] border border-white/5 bg-black/40 px-3 py-2 text-sm font-normal text-white outline-none focus:border-blue-500/50"
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-[12px] bg-white/5 py-3 text-[10px] font-black uppercase text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInBody}
                disabled={isSavingInbody}
                className="flex-1 rounded-[12px] bg-blue-500/20 py-3 text-[10px] font-black uppercase text-blue-400 disabled:opacity-50"
              >
                {isSavingInbody ? '...' : 'Save'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProfileTab;
