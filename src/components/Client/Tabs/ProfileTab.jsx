import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Plus, RefreshCw, Save, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import ClientAvatar from '../../shared/ClientAvatar';

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
  { id: '1m', label: '1 month', months: 1 },
  { id: '3m', label: '3 months', months: 3 },
  { id: '6m', label: '6 months', months: 6 },
  { id: 'all', label: 'All', months: null },
];

const INBODY_METRICS = [
  {
    key: 'weight',
    label: 'Weight',
    unit: 'kg',
    color: '#60b4ff',
    goal: 'decrease',
    decimals: 1,
    goalLabel: 'Goal: decrease',
  },
  {
    key: 'smm',
    label: 'SMM',
    unit: 'kg',
    color: '#7bf1a8',
    goal: 'increase',
    decimals: 1,
    goalLabel: 'Goal: maintain or increase',
  },
  {
    key: 'pbf',
    label: 'PBF',
    unit: '%',
    color: '#ffcb6b',
    goal: 'decrease',
    decimals: 1,
    goalLabel: 'Goal: decrease',
  },
  {
    key: 'bodyFatMass',
    label: 'Body Fat Mass',
    unit: 'kg',
    color: '#ff9b71',
    goal: 'decrease',
    decimals: 1,
    goalLabel: 'Goal: decrease',
  },
  {
    key: 'bmi',
    label: 'BMI',
    unit: 'kg/m²',
    color: '#b39dff',
    goal: 'decrease',
    decimals: 1,
    goalLabel: 'Goal: decrease',
  },
  {
    key: 'visceralFat',
    label: 'Visceral Fat',
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
  unit: 'metrics',
  color: '#c8f53f',
};

const DEMO_INBODY_RECORDS_BY_PHONE = {
  '0909113799': [
    {
      id: 'demo-cam-2025-04-16',
      measured_at: '2025-04-16T08:16:00+07:00',
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

const formatChartDate = (value) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(value));

const formatAxisDate = (value) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
}).format(new Date(value));

const formatShortDate = (value) => {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
};

const parseNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
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

const InBodyMetricCard = ({ metric, isActive, latestValue, delta, onClick, helperText, badgeLabel }) => {
  const tone = getMetricGoalTone(metric, delta);
  const badgeText = badgeLabel ?? (delta !== null ? `${formatMetricDelta(delta, metric.decimals)} ${metric.unit}` : 'No previous data');
  const badgeClassName = badgeLabel
    ? 'border-white/[0.08] bg-white/[0.04] text-white/45'
    : delta !== null
      ? tone.badgeClassName
      : 'border-white/[0.06] bg-white/[0.03] text-white/28';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-[126px] rounded-[20px] border px-3.5 py-3 text-left transition-all active:scale-[0.98] ${
        isActive
          ? 'bg-white/[0.05] shadow-lg'
          : 'bg-white/[0.02] hover:bg-white/[0.03]'
      }`}
      style={{
        borderColor: isActive ? `${metric.color}55` : 'rgba(255,255,255,0.06)',
        boxShadow: isActive ? `0 0 0 1px ${metric.color}22, 0 16px 30px rgba(0,0,0,0.22)` : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.24em] text-white/32">{metric.label}</p>
          <div className="mt-2 flex flex-wrap items-end gap-1">
            <p className="text-[20px] font-light leading-none text-white">{latestValue}</p>
            {metric.unit ? (
              <span className="pb-0.5 text-[9px] font-black uppercase tracking-wide text-white/35">{metric.unit}</span>
            ) : null}
          </div>
        </div>

        {helperText ? (
          <div className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white/35">
            {helperText}
          </div>
        ) : null}
      </div>

      <div className={`mt-3 inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wide ${badgeClassName}`}>
        {badgeText}
      </div>
    </button>
  );
};

const InBodyProgressChart = ({ records, selectedMetricKey, activeIndex, onActiveIndexChange }) => {
  const width = 320;
  const height = 220;
  const padding = { top: 18, right: 14, bottom: 30, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const chartBottom = padding.top + plotHeight;
  const selectedMetric = INBODY_METRICS.find((metric) => metric.key === selectedMetricKey) || null;
  const isAllView = selectedMetricKey === 'all';

  const xPositions = records.map((record, index) => {
    if (records.length === 1) return padding.left + plotWidth / 2;
    return padding.left + (plotWidth * index) / (records.length - 1);
  });

  const metricsForChart = isAllView ? INBODY_METRICS : [selectedMetric].filter(Boolean);

  const scales = metricsForChart.reduce((acc, metric) => {
    const values = records
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
    const points = records.map((record, index) => ({
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

  const selectedRecord = records[activeIndex] || null;

  return (
    <div className="relative rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-4 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/28">
            {isAllView ? 'Normalized trends' : selectedMetric?.label}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-white/72">
            {isAllView ? 'Visual comparison only. Tooltip always shows real values.' : selectedMetric?.goalLabel}
          </p>
        </div>
        {!isAllView && selectedMetric ? (
          <div
            className="rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wide"
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
            className="pointer-events-none absolute z-20 min-w-[210px] rounded-[18px] border border-white/[0.08] bg-[rgba(8,14,25,0.96)] px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl"
            style={{
              left: `${Math.min(Math.max(((xPositions[activeIndex] / width) * 100), 18), 82)}%`,
              top: '8px',
              transform: 'translateX(-50%)',
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-white/35">{formatChartDate(selectedRecord.measuredAt)}</p>
            <div className="mt-2 space-y-1.5">
              {(isAllView ? INBODY_METRICS : [selectedMetric]).filter(Boolean).map((metric) => {
                const current = selectedRecord[metric.key];
                if (current === null || current === undefined || Number.isNaN(current)) return null;

                const previousValue = (() => {
                  for (let index = activeIndex - 1; index >= 0; index -= 1) {
                    const value = records[index][metric.key];
                    if (value !== null && value !== undefined && !Number.isNaN(value)) return value;
                  }
                  return null;
                })();

                const delta = previousValue === null ? null : current - previousValue;
                const tone = getMetricGoalTone(metric, delta);

                return (
                  <div key={metric.key} className="flex items-center justify-between gap-4 text-[11px]">
                    <span className="font-semibold" style={{ color: metric.color }}>{metric.label}</span>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {formatMetricValue(current, metric.decimals)} {metric.unit}
                      </p>
                      {delta !== null ? (
                        <p className={`text-[10px] font-black uppercase tracking-wide ${tone.textClassName}`}>
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

        <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full overflow-visible">
          {tickValues.map((tickValue, index) => {
            const y = padding.top + (plotHeight * index) / (tickValues.length - 1);
            const label = isAllView ? `${Math.round(100 - ((index * 100) / (tickValues.length - 1)))}%` : formatMetricValue(tickValues[tickValues.length - 1 - index], selectedMetric?.decimals ?? 1);

            return (
              <g key={`${tickValue}-${index}`}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 6" />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.24)" fontSize="9" fontWeight="700">
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
                  strokeWidth="2.5"
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
                    r={activeIndex === point.index ? 4.5 : 3.2}
                    fill={metric.color}
                    stroke="rgba(10,16,26,0.95)"
                    strokeWidth="2"
                  />
                ) : null
              ))}
            </g>
          ))}

          {records.map((record, index) => {
            const prevX = index === 0 ? padding.left : (xPositions[index - 1] + xPositions[index]) / 2;
            const nextX = index === records.length - 1 ? width - padding.right : (xPositions[index] + xPositions[index + 1]) / 2;

            return (
              <rect
                key={`zone-${record.measuredAt}-${index}`}
                x={prevX}
                y={padding.top}
                width={Math.max(nextX - prevX, 20)}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => onActiveIndexChange(index)}
                onClick={() => onActiveIndexChange(index)}
              />
            );
          })}

          {records.map((record, index) => {
            if (!(index === 0 || index === records.length - 1 || index === Math.floor(records.length / 2))) return null;

            return (
              <text
                key={`label-${record.measuredAt}`}
                x={xPositions[index]}
                y={height - 8}
                textAnchor={index === 0 ? 'start' : index === records.length - 1 ? 'end' : 'middle'}
                fill="rgba(255,255,255,0.28)"
                fontSize="9"
                fontWeight="700"
              >
                {formatAxisDate(record.measuredAt)}
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

const ProfileTab = ({ client, onRegisterActions }) => {
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
  }, [fetchInBody, fetchProgressPhotos]);

  useEffect(() => {
    if (!onRegisterActions) return undefined;

    onRegisterActions({
      openEdit: () => setIsEditMode(true),
      openInbody: () => setIsModalOpen(true),
      openPhotos: () => {
        progressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    });

    return () => onRegisterActions(null);
  }, [onRegisterActions]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const fileName = `client-${client.id}-avatar`;
      const { error: avatarError } = await supabase.storage.from('client-avatars').upload(fileName, file, { upsert: true });

      if (avatarError) throw avatarError;

      const { data } = supabase.storage.from('client-avatars').getPublicUrl(fileName);
      await supabase.from('clients').update({ avatar_url: data.publicUrl }).eq('id', client.id);

      alert('Avatar updated successfully.');
      window.location.reload();
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

  useEffect(() => {
    setActiveChartIndex(filteredChartRecords.length > 0 ? filteredChartRecords.length - 1 : null);
  }, [filteredChartRecords, selectedMetricKey, timeFilter]);

  const metricCards = useMemo(() => {
    const latestMeasurementDate = filteredChartRecords.length > 0
      ? formatShortDate(filteredChartRecords[filteredChartRecords.length - 1].measuredAt)
      : null;
    const overviewCard = {
      ...ALL_METRIC,
      latestValue: `${INBODY_METRICS.length}`,
      helperText: 'overview',
      delta: null,
      badgeLabel: filteredChartRecords.length > 0
        ? `${filteredChartRecords.length} scans${latestMeasurementDate ? ` · ${latestMeasurementDate}` : ''}`
        : 'No scan data',
    };

    const metricSummaries = INBODY_METRICS.map((metric) => {
      const { latest, previous } = getLastTwoValues(filteredChartRecords, metric.key);
      return {
        ...metric,
        latestValue: formatMetricValue(latest, metric.decimals),
        delta: latest !== null && previous !== null ? latest - previous : null,
      };
    });

    return [overviewCard, ...metricSummaries];
  }, [filteredChartRecords]);

  const personalInfoCells = [
    { label: 'DATE OF BIRTH', value: client.dob || '--' },
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
                    avatarUrl={client.avatar_url || client.avatar}
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
    <div className="relative isolate space-y-5 pb-6 pt-5 animate-slide-up">
      <div className="pointer-events-none absolute left-1/2 top-2 h-40 w-40 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-2 top-48 h-28 w-28 rounded-full bg-emerald-500/[0.08] blur-3xl" />

      <div className="relative text-center">
        <ClientAvatar
          name={client.name}
          avatarUrl={client.avatar_url || client.avatar}
          sizeClassName="mx-auto h-24 w-24"
          showInnerRing={true}
          ringClassName="border border-white/10 bg-blue-500/15 shadow-xl shadow-blue-500/10"
        />
        <p className="mt-4 text-sm font-bold text-white">{client.name}</p>
        <p className="mt-1 text-[10px] font-medium text-neutral-600">{client.phone || 'No phone number yet'}</p>
        <div className="mt-3 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 shadow-lg shadow-blue-500/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-300">{client.goal || 'NO GOAL YET'}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="app-label text-[9px] font-black uppercase tracking-widest">InBody Progress</p>
            <p className="mt-1 text-[11px] text-white/45">Track body composition trends over time.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-[16px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wide text-white transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Add InBody
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <InBodyMetricCard
              key={metric.key}
              metric={metric}
              latestValue={metric.latestValue}
              delta={metric.delta}
              helperText={metric.helperText}
              badgeLabel={metric.badgeLabel}
              isActive={selectedMetricKey === metric.key}
              onClick={() => setSelectedMetricKey(metric.key)}
            />
          ))}
        </div>

        <div className="inline-flex rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-1">
          {TIME_FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTimeFilter(option.id)}
              className={`rounded-[14px] px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                timeFilter === option.id
                  ? 'bg-white text-black shadow-lg'
                  : 'text-white/35'
              }`}
            >
              {option.label}
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
          ].map((photo) => (
            <label key={photo.type} className="block cursor-pointer">
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
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleProgressPhotoUpload(e, photo.type)}
                className="hidden"
                disabled={isUploadingProgress}
              />
            </label>
          ))}
        </div>
      </div>

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
      </div>

      {isModalOpen && (
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
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
