import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';

// Heavy three.js scene is code-split out of the initial bundle.
const AnalyzingScreen = lazy(() => import('./AnalyzingScreen'));

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  appBg: '#F9F7F7',
  surface: '#FFFFFF',
  surfaceAlt: '#DBE2EF',
  hairline: 'rgba(17,45,78,0.10)',
  hairlineStr: 'rgba(17,45,78,0.20)',
  ink: '#112D4E',
  ink2: '#3F72AF',
  ink3: '#7A92B5',
  ink4: '#B9C5D8',
  ok: '#3F72AF',
  okFill: '#3F72AF',
  okSoft: '#DBE2EF',
  radiusCard: 24,
  radiusInner: 16,
  radiusPill: 999,
};
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const STABLE = { label: 'Stable', long: 'No change detected', fg: '#3F72AF', bg: '#DBE2EF', fill: '#3F72AF', glyph: 'check' };

// ─── Global keyframes ──────────────────────────────────────────────────────
const GLOBAL_CSS = `
@keyframes bsPulseA { 0%,100% { transform: scale(1); opacity: 0.18; } 50% { transform: scale(1.15); opacity: 0.04; } }
@keyframes bsPulseB { 0%,100% { transform: scale(1); opacity: 0.22; } 50% { transform: scale(1.32); opacity: 0; } }
@keyframes bsEcg { from { stroke-dashoffset: 240; } to { stroke-dashoffset: 0; } }
@keyframes bsWave { 0%,100% { transform: scaleY(0.22); } 50% { transform: scaleY(1); } }
/* Opacity-only: animating transform here would turn the page wrapper into a
   containing block for position:fixed children (the FAB) and un-pin them. */
@keyframes bsFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes bsBtnPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
`;

// ─── Inline SVG icon set ───────────────────────────────────────────────────
function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.6 }) {
  const s = { width: size, height: size, display: 'inline-block', flexShrink: 0 };
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'check':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M4 12.5l5 5L20 6.5"/></svg>;
    case 'alert':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 8v5M12 16.5v.5"/><path {...p} d="M12 3 2.5 20h19L12 3z"/></svg>;
    case 'face':
      return <svg style={s} viewBox="0 0 24 24"><ellipse {...p} cx="12" cy="12" rx="6.5" ry="8"/><path {...p} d="M9 11h.01M15 11h.01M9 15.5c1 1 5 1 6 0"/></svg>;
    case 'mic':
      return <svg style={s} viewBox="0 0 24 24"><rect {...p} x="9" y="3" width="6" height="12" rx="3"/><path {...p} d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>;
    case 'home':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9z"/></svg>;
    case 'pulse':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M2 12h4l2-5 3 10 2-6 2 3h7"/></svg>;
    case 'trends':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M3 17l5-5 4 4 8-9"/><path {...p} d="M15 7h5v5"/></svg>;
    case 'team':
      return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="9" cy="9" r="3"/><circle {...p} cx="17" cy="10" r="2.3"/><path {...p} d="M3 19c0-3 3-5 6-5s6 2 6 5M14.5 18.7c.2-2.4 2-3.7 4-3.7s2.5 1 2.5 3"/></svg>;
    case 'settings':
      return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8L4.2 7A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case 'play':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} fill={color} d="M7 5l12 7-12 7V5z"/></svg>;
    case 'chevron':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M9 6l6 6-6 6"/></svg>;
    case 'arrow-right':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'phone':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>;
    case 'share':
      return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="6" cy="12" r="2.5"/><circle {...p} cx="18" cy="6" r="2.5"/><circle {...p} cx="18" cy="18" r="2.5"/><path {...p} d="M8 11l8-4M8 13l8 4"/></svg>;
    case 'close':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'plus':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M12 5v14M5 12h14"/></svg>;
    case 'sun':
      return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="4"/><path {...p} d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case 'sound':
      return <svg style={s} viewBox="0 0 24 24"><path {...p} d="M4 9h3l5-4v14l-5-4H4V9zM16 8a5 5 0 0 1 0 8"/></svg>;
    case 'dot':
      return <svg style={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill={color}/></svg>;
    case 'time':
      return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M12 7v5l3 2"/></svg>;
    default:
      return <svg style={s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="9"/></svg>;
  }
}

// ─── Animated ECG status orb ───────────────────────────────────────────────
function StatusOrb({ size = 180 }) {
  const inner = size - 48;
  return (
    <div style={{
      position: 'relative', width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: STABLE.fill,
        animation: 'bsPulseA 3.4s ease-in-out infinite',
      }}/>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: STABLE.fill,
        animation: 'bsPulseB 3.4s ease-in-out infinite',
      }}/>
      <div style={{
        position: 'relative', width: inner, height: inner, borderRadius: '50%',
        background: STABLE.fill, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 14px 40px ${STABLE.fill}55, inset 0 1px 0 rgba(255,255,255,0.35)`,
      }}>
        <svg
          width={inner * 0.72} height={inner * 0.46}
          viewBox="0 0 92 60" style={{ display: 'block' }}
        >
          <path
            d="M 4 38 L 16 38 L 18 30 L 20 38 L 24 38 L 26 32 L 28 38 L 36 38 L 40 6 L 44 52 L 48 38 L 56 38 Q 68 12 80 38 L 88 38"
            fill="none" stroke="#fff" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="240"
            style={{ animation: 'bsEcg 1.7s linear infinite' }}
          />
        </svg>
      </div>
    </div>
  );
}

// ─── Status pill (stable) ──────────────────────────────────────────────────
function StatusPill({ size = 'md' }) {
  const padY = size === 'sm' ? 4 : 6;
  const padX = size === 'sm' ? 10 : 12;
  const fs = size === 'sm' ? 12 : 13;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: `${padY}px ${padX}px`, borderRadius: T.radiusPill,
      background: STABLE.bg, color: STABLE.fg,
      fontFamily: FONT, fontSize: fs, fontWeight: 600,
      letterSpacing: -0.1, lineHeight: 1,
    }}>
      <Icon name={STABLE.glyph} size={size === 'sm' ? 12 : 14} color={STABLE.fg} strokeWidth={2.2}/>
      {STABLE.label}
    </span>
  );
}

// ─── Small deviation sparkline (with baseline + soft shading) ─────────────
// `points` are signed fractions just like the dashboard chart.
let bsMiniGradSeq = 0;
function Sparkline({ points, color = T.ink2, width = 140, height = 40 }) {
  const gradId = useMemo(() => `bsMiniGrad-${++bsMiniGradSeq}`, []);
  if (!points || points.length < 2) return null;
  const padT = 4, padB = 4;
  const innerH = height - padT - padB;
  const maxAbs = Math.max(0.04, ...points.map((p) => Math.abs(p)));
  const yMax = maxAbs * 1.3;
  const yMin = -yMax;
  const range = yMax - yMin;
  const stepX = width / (points.length - 1);
  const toY = (v) => padT + innerH - ((v - yMin) / range) * innerH;
  const segs = points.map((p, i) => [i * stepX, toY(p)]);
  let d = `M ${segs[0][0]} ${segs[0][1]}`;
  for (let i = 1; i < segs.length; i++) {
    const [x1, y1] = segs[i - 1];
    const [x2, y2] = segs[i];
    const mx = (x1 + x2) / 2;
    d += ` Q ${mx} ${y1}, ${mx} ${(y1 + y2) / 2} T ${x2} ${y2}`;
  }
  const baselineY = toY(0);
  // Closed area from line back to baseline; works regardless of sign.
  const area =
    `${d} L ${segs[segs.length - 1][0]} ${baselineY} ` +
    `L ${segs[0][0]} ${baselineY} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Baseline reference */}
      <line x1="0" y1={baselineY} x2={width} y2={baselineY}
        stroke={T.hairlineStr} strokeWidth="1"/>
      <text x="2" y={baselineY - 3}
        fontSize="8" fill={T.ink3} fontFamily={FONT} fontWeight="600">0</text>
      {/* Area + line */}
      <path d={area} fill={`url(#${gradId})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Deviation-from-baseline line chart ───────────────────────────────────
// `points` are signed deviations as fractions (e.g. +0.02 = +2% above
// baseline, -0.01 = -1% below). Y-axis is symmetric around 0 ("Baseline")
// with at least ±5% headroom so the line has room to breathe.
function LineChart({ points, labels, color = T.ink2, width = 300, height = 130 }) {
  if (!points || points.length < 2) return null;
  const padL = 56, padR = 10, padT = 12, padB = 22;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const maxAbs = Math.max(0.05, ...points.map((p) => Math.abs(p)));
  const yMax = maxAbs * 1.3;
  const yMin = -yMax;
  const range = yMax - yMin;
  const stepX = innerW / (points.length - 1);
  const toX = (i) => padL + i * stepX;
  const toY = (v) => padT + innerH - ((v - yMin) / range) * innerH;
  const segs = points.map((p, i) => [toX(i), toY(p)]);
  let d = `M ${segs[0][0]} ${segs[0][1]}`;
  for (let i = 1; i < segs.length; i++) {
    const [x1, y1] = segs[i - 1];
    const [x2, y2] = segs[i];
    const mx = (x1 + x2) / 2;
    d += ` Q ${mx} ${y1}, ${mx} ${(y1 + y2) / 2} T ${x2} ${y2}`;
  }
  const baselineY = toY(0);
  const tickPct = (yMax * 100).toFixed(0);
  const yTicks = [
    { v: yMax, label: `+${tickPct}%`, dashed: true  },
    { v: 0,    label: 'Baseline',     dashed: false },
    { v: yMin, label: `−${tickPct}%`, dashed: true  },
  ];
  const gradTop = `bsLcGradTop-${color.replace('#', '')}`;
  const gradBot = `bsLcGradBot-${color.replace('#', '')}`;
  // Two-direction fill: tint above baseline up, tint below baseline down.
  const areaUp =
    `M ${segs[0][0]} ${baselineY} ` +
    segs.map(([x, y]) => `L ${x} ${y}`).join(' ') +
    ` L ${segs[segs.length - 1][0]} ${baselineY} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradTop} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={gradBot} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor={color} stopOpacity="0.12"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
        <clipPath id={`bsClipTop-${color.replace('#', '')}`}>
          <rect x={padL} y={padT} width={innerW} height={baselineY - padT}/>
        </clipPath>
        <clipPath id={`bsClipBot-${color.replace('#', '')}`}>
          <rect x={padL} y={baselineY} width={innerW} height={padT + innerH - baselineY}/>
        </clipPath>
      </defs>

      {/* Y-axis grid + labels */}
      {yTicks.map((t, i) => {
        const y = toY(t.v);
        const isBaseline = t.v === 0;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={width - padR} y2={y}
              stroke={isBaseline ? T.hairlineStr : T.hairline}
              strokeWidth={isBaseline ? 1.2 : 1}
              strokeDasharray={t.dashed ? '3 4' : '0'}/>
            <text x={padL - 6} y={y + 3} textAnchor="end"
              fontSize={isBaseline ? 9 : 8.5}
              fill={isBaseline ? T.ink2 : T.ink3}
              fontFamily={isBaseline ? FONT : MONO}
              fontWeight={isBaseline ? 700 : 400}>
              {t.label}
            </text>
          </g>
        );
      })}

      {/* Tinted area above/below baseline */}
      <g clipPath={`url(#bsClipTop-${color.replace('#', '')})`}>
        <path d={areaUp} fill={`url(#${gradTop})`}/>
      </g>
      <g clipPath={`url(#bsClipBot-${color.replace('#', '')})`}>
        <path d={areaUp} fill={`url(#${gradBot})`}/>
      </g>

      {/* Line + points */}
      <path d={d} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"/>
      {segs.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === segs.length - 1 ? 3.5 : 2.2}
          fill={i === segs.length - 1 ? '#fff' : color}
          stroke={color} strokeWidth={i === segs.length - 1 ? 2 : 0}/>
      ))}

      {/* X-axis day labels */}
      {labels && labels.map((l, i) => (
        <text key={i} x={toX(i)} y={height - 6} textAnchor="middle"
          fontSize="9.5" fill={T.ink3} fontFamily={FONT}
          fontWeight={i === labels.length - 1 ? 700 : 500}>
          {l}
        </text>
      ))}
    </svg>
  );
}

// ─── Avatar (initials) ────────────────────────────────────────────────────
function Avatar({ name, size = 36, bg = T.ink, color = '#fff' }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, fontSize: size * 0.36, fontWeight: 600, letterSpacing: 0.2,
      flexShrink: 0,
    }}>{initials}</div>
  );
}

// ─── Waveform (voice) ─────────────────────────────────────────────────────
function Waveform({ active, levels, height = 56, bars = 20 }) {
  // When real `levels` are supplied, render them directly. Otherwise fall back
  // to a placeholder (simulated jitter when active, low idle bars when not).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active || levels) return;
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, [active, levels]);

  const n = levels ? levels.length : bars;
  const seeds = useMemo(
    () => Array.from({ length: n }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + 0.5))),
    [n]
  );
  const heights = levels
    ? levels
    : seeds.map(s => active ? Math.min(1, s * (0.55 + Math.random() * 0.5)) : 0.18 + s * 0.12);
  // tick is only read to drive re-renders in the simulated branch
  void tick;
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
      {heights.map((h, i) => (
        <span key={i} style={{
          flex: 1, height: '100%',
          background: active ? T.ink : T.ink4,
          borderRadius: 4,
          transform: `scaleY(${Math.max(0.06, Math.min(1, h))})`,
          transformOrigin: 'center',
          transition: 'transform 60ms linear',
          opacity: active ? 0.55 + 0.45 * Math.min(1, h) : 0.55,
        }}/>
      ))}
    </div>
  );
}

// ─── 3-step Progress track ────────────────────────────────────────────────
function ProgressTrack({ active, allDone = false }) {
  const labels = ['Face', 'Voice', 'Result'];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {labels.map((l, i) => {
          const done = allDone || i < active;
          const cur = !allDone && i === active;
          return (
            <React.Fragment key={l}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: done ? T.ink : T.surface,
                border: done ? 'none' : `1.5px solid ${cur ? T.ink : T.hairlineStr}`,
                color: done ? '#fff' : cur ? T.ink : T.ink3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              }}>
                {done ? <Icon name="check" size={12} color="#fff" strokeWidth={2.6}/> : i + 1}
              </div>
              {i < labels.length - 1 && (
                <div style={{
                  flex: 1, height: 2, borderRadius: 1,
                  background: (allDone || i < active) ? T.ink : T.hairlineStr,
                }}/>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
        {labels.map((l, i) => (
          <span key={l} style={{
            fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
            color: (allDone || i === active) ? T.ink : T.ink3,
          }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Reusable header for in-flow screens ──────────────────────────────────
function FlowHeader({ onClose, label }) {
  return (
    <div style={{ padding: '8px 22px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={onClose} style={{
        width: 32, height: 32, borderRadius: '50%', background: T.surface,
        border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', padding: 0,
      }}>
        <Icon name="close" size={16} color={T.ink}/>
      </button>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <span style={{
          fontSize: 11, color: T.ink3, letterSpacing: 1.4,
          textTransform: 'uppercase', fontWeight: 600, fontFamily: FONT,
        }}>{label}</span>
      </div>
      <div style={{ width: 32 }}/>
    </div>
  );
}

// ─── Floating action button (Run active check) ────────────────────────────
function RunCheckFab({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'fixed',
      bottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
      left: '50%', transform: 'translateX(-50%)',
      height: 54, padding: '0 28px', borderRadius: 999, border: 'none',
      background: T.ink, color: '#fff',
      fontFamily: FONT, fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
      display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer',
      boxShadow: '0 14px 32px rgba(17,45,78,0.28)',
      whiteSpace: 'nowrap', zIndex: 30,
    }}>
      <Icon name="pulse" size={18} color="#fff" strokeWidth={2}/>
      Run active check
    </button>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────
function HomeScreen({ onRunCheck, onOpenDashboard }) {
  const [updatedAt] = useState(() => {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  });
  // Signed deviation from baseline (fractions).
  const facePts  = [-0.02,  0.01, -0.01,  0.02, -0.01,  0.01,  0.00,  0.02,  0.00];
  const voicePts = [-0.03,  0.00, -0.01,  0.02, -0.02,  0.01,  0.00,  0.01,  0.00];

  return (
    <div style={{ minHeight: '100%', paddingBottom: 'calc(130px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div style={{ padding: '8px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name="Kee P" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: T.ink3,
            textTransform: 'uppercase', letterSpacing: 1.4, lineHeight: 1.2,
          }}>Good morning</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.2 }}>Kee</div>
        </div>
        <button aria-label="Kemenkes" style={{
          width: 40, height: 40, background: 'transparent', border: 'none',
          padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="47 -2 106 117" width="36" height="40" style={{ display: 'block' }}>
            <path fill="#09b9a4" fillRule="evenodd" d="m87.2 61.3v34.7c0 9.4 7.7 17.1 17.1 17.1 9.4 0 17.2-7.7 17.2-17.1v-0.4zm0-43.7v34.7l34.2-34.3v-0.4c0-9.4-7.7-17.1-17.1-17.1-9.4 0-17.1 7.7-17.1 17.1zm-21.5 56.3h17.9v-34.2h-17.9c-9.4 0-17.1 7.7-17.1 17.1 0 9.4 7.7 17.1 17.1 17.1z"/>
            <path fill="#cedc27" fillRule="evenodd" d="m121.5 23.1v32h-32.1zm3.5-3.5c6.4-5.9 16.4-5.7 22.6 0.5 6.4 6.3 6.4 16.7 0 23l-11.9 12h-10.7zm10.7 39l11.9 12c6.4 6.3 6.4 16.7 0 23.1-6.2 6.2-16.2 6.3-22.6 0.4v-35.5zm-14.1 0v32.1l-32-32.1z"/>
          </svg>
        </button>
      </div>

      {/* Status section */}
      <div style={{ padding: '24px 22px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 999,
          background: T.surface, border: `1px solid ${T.hairline}`,
          fontSize: 11, fontWeight: 600, color: T.ink2,
          textTransform: 'uppercase', letterSpacing: 1.2,
        }}>
          <Icon name="time" size={12} color={T.ink2} strokeWidth={2}/>
          Updated {updatedAt}
        </span>

        <div style={{ margin: '20px 0 16px' }}>
          <StatusOrb size={180}/>
        </div>

        <h1 style={{
          margin: '0 0 6px', fontSize: 32, fontWeight: 400, color: T.ink,
          letterSpacing: -0.6, lineHeight: 1.15, textAlign: 'center', fontFamily: FONT,
        }}>
          You look <span style={{ color: T.ink2, fontWeight: 600 }}>steady</span> today.
        </h1>
        <p style={{
          margin: 0, fontSize: 13.5, color: T.ink2, textAlign: 'center', lineHeight: 1.4,
        }}>Face and voice readings match your baseline.</p>
      </div>

      {/* Signal cards */}
      <div style={{ padding: '22px 22px 0' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '0 4px 10px',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: T.ink3,
            textTransform: 'uppercase', letterSpacing: 1.2,
          }}>Today's signals</span>
          <span style={{ fontSize: 11, color: T.ink3, letterSpacing: 0.4 }}>vs. baseline</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SignalCard icon="face" title="Face" points={facePts} time="just now" onClick={onOpenDashboard}/>
          <SignalCard icon="mic"  title="Voice" points={voicePts} time="3 min ago" onClick={onOpenDashboard}/>
        </div>
      </div>

      {/* Passive check row — clicking "run one now" starts an active check */}
      <div style={{ padding: '14px 22px 0' }}>
        <button onClick={onRunCheck} style={{
          width: '100%', padding: 14, borderRadius: 18, background: T.surface,
          border: `1px solid ${T.hairline}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
          fontFamily: FONT,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, background: T.appBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="time" size={20} color={T.ink2}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, lineHeight: 1.2 }}>
              14 passive checks today
            </div>
            <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>
              Next at 11:40 · or run one now
            </div>
          </div>
          <Icon name="chevron" size={16} color={T.ink3}/>
        </button>
      </div>

      <RunCheckFab onClick={onRunCheck}/>
    </div>
  );
}

function SignalCard({ icon, title, points, time, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: T.surface, borderRadius: 22, padding: 16,
      border: `1px solid ${T.hairline}`, textAlign: 'left',
      cursor: 'pointer', fontFamily: FONT, color: T.ink,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, background: T.appBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={14} color={T.ink2}/>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.ink2 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontSize: 32, fontWeight: 600, color: T.ink, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>0</span>
        <span style={{ fontSize: 11, color: T.ink3 }}>% from baseline</span>
      </div>
      <div style={{ height: 36 }}>
        <Sparkline points={points} color={T.ink2} width={140} height={36}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.ok }}>±0</span>
        <span style={{ fontSize: 11, color: T.ink3 }}>{time}</span>
      </div>
    </button>
  );
}

// Trend data per time range — each entry shapes the chart for that tab.
const TREND_HEADERS = { day: 'Last 24 hours', week: 'Last 7 days', month: 'Last 30 days' };
const FACE_TREND = {
  day:   { points: [-0.01, 0.00, 0.01, -0.01, 0.00, 0.02, -0.01, 0.00],
           labels: ['9a','12p','3p','6p','9p','12a','3a','6a'] },
  week:  { points: [-0.02, 0.01, -0.01, 0.02, 0.00, 0.01, 0.00],
           labels: ['M','T','W','T','F','S','S'] },
  month: { points: [-0.03, -0.01, 0.01, 0.00, 0.02],
           labels: ['W1','W2','W3','W4','W5'] },
};
const VOICE_TREND = {
  day:   { points: [-0.02, 0.00, 0.01, -0.02, 0.01, 0.00, -0.01, 0.00],
           labels: ['9a','12p','3p','6p','9p','12a','3a','6a'] },
  week:  { points: [-0.03, 0.01, -0.01, 0.02, -0.02, 0.00, 0.00],
           labels: ['M','T','W','T','F','S','S'] },
  month: { points: [-0.04, 0.00, -0.02, 0.01, 0.00],
           labels: ['W1','W2','W3','W4','W5'] },
};
// Recent checks shown under the trend cards — content varies per range so
// the Day / Week / Month tabs change more than just the charts.
const RECENT_CHECKS = {
  day: [
    { kind: 'Active check',    time: '9:14 AM', note: 'Face + voice',     active: true },
    { kind: 'Passive reading', time: '8:42 AM', note: 'Background scan' },
    { kind: 'Passive reading', time: '7:30 AM', note: 'Background scan' },
  ],
  week: [
    { kind: 'Active check',    time: 'Today 9:14 AM', note: 'Face + voice', active: true },
    { kind: 'Active check',    time: 'Tue 8:50 AM',   note: 'Face + voice', active: true },
    { kind: 'Passive reading', time: 'Mon',            note: 'Background scan' },
  ],
  month: [
    { kind: 'Active check',    time: 'Today',         note: 'Face + voice', active: true },
    { kind: 'Active check',    time: 'Last week',     note: 'Face + voice', active: true },
    { kind: 'Active check',    time: '2 weeks ago',   note: 'Face + voice', active: true },
  ],
};

function DashboardScreen({ onRunCheck, onBack }) {
  const [range, setRange] = useState('week');
  return (
    <div style={{ minHeight: '100%', paddingBottom: 'calc(130px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div style={{
        padding: '8px 22px 14px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: T.ink3,
            textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4,
          }}>Trends</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: T.ink, letterSpacing: -0.4, lineHeight: 1.1 }}>
            {TREND_HEADERS[range]}
          </div>
        </div>
        <button onClick={onBack} aria-label="Home" style={{
          width: 36, height: 36, borderRadius: '50%', background: T.surface,
          border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', padding: 0,
        }}>
          <Icon name="home" size={18} color={T.ink2}/>
        </button>
      </div>

      {/* Status banner */}
      <div style={{ padding: '0 22px' }}>
        <div style={{
          padding: '14px 16px', borderRadius: 20, background: STABLE.bg,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: STABLE.fill,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="check" size={20} color="#fff" strokeWidth={2.4}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: STABLE.fg, lineHeight: 1.2 }}>Stable</div>
            <div style={{ fontSize: 12.5, color: STABLE.fg, opacity: 0.85, marginTop: 2 }}>
              No change detected
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '14px 22px 0' }}>
        <div style={{
          display: 'flex', gap: 6, padding: 4, borderRadius: 999,
          background: T.surface, border: `1px solid ${T.hairline}`,
        }}>
          {['day', 'week', 'month'].map((r) => {
            const on = r === range;
            return (
              <button key={r} onClick={() => setRange(r)} style={{
                flex: 1, padding: '8px 0', borderRadius: 999, border: 'none',
                background: on ? T.ink : 'transparent',
                color: on ? '#fff' : T.ink2,
                fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{r}</button>
            );
          })}
        </div>
      </div>

      {/* Face trend card — signed deviation from personal baseline */}
      <div style={{ padding: '12px 22px 0' }}>
        <TrendCard
          icon="face" title="Face symmetry"
          points={FACE_TREND[range].points}
          labels={FACE_TREND[range].labels}
        />
      </div>

      {/* Voice trend card */}
      <div style={{ padding: '10px 22px 0' }}>
        <TrendCard
          icon="mic" title="Voice clarity"
          points={VOICE_TREND[range].points}
          labels={VOICE_TREND[range].labels}
        />
      </div>

      {/* Recent checks — list adapts to the active range */}
      <div style={{ padding: '12px 22px 0' }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: T.ink3,
          textTransform: 'uppercase', letterSpacing: 1.2, padding: '0 4px 8px',
        }}>Recent checks</div>
        <div style={{
          background: T.surface, borderRadius: 18, border: `1px solid ${T.hairline}`,
          overflow: 'hidden',
        }}>
          {RECENT_CHECKS[range].map((c, i, arr) => (
            <React.Fragment key={i}>
              <CheckRow kind={c.kind} time={c.time} note={c.note} active={c.active}/>
              {i < arr.length - 1 && <Divider/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <RunCheckFab onClick={onRunCheck}/>
    </div>
  );
}

function TrendCard({ icon, title, points, labels }) {
  const latest = points[points.length - 1] ?? 0;
  const pct = Math.abs(latest * 100);
  const sign = latest > 0.0005 ? '+' : latest < -0.0005 ? '−' : '±';
  return (
    <div style={{
      background: T.surface, borderRadius: T.radiusCard, padding: 16,
      border: `1px solid ${T.hairline}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, background: T.appBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={14} color={T.ink2}/>
        </div>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: T.ink }}>{title}</span>
        <span style={{
          fontSize: 18, fontWeight: 700, color: T.ink,
          fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3,
        }}>{sign}{pct.toFixed(0)}%</span>
        <span style={{
          fontSize: 10.5, fontWeight: 600, color: T.ink3,
          textTransform: 'uppercase', letterSpacing: 0.4,
        }}>vs baseline</span>
      </div>
      <ChartContainer points={points} labels={labels}/>
    </div>
  );
}

function ChartContainer({ points, labels }) {
  const ref = useRef(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    if (!ref.current) return;
    const update = () => setW(ref.current ? ref.current.clientWidth : 320);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: '100%', height: 110 }}>
      <LineChart points={points} labels={labels} width={w} height={110}/>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: T.hairline, margin: '0 14px' }}/>;
}

function CheckRow({ kind, time, note, active }) {
  return (
    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 12,
        background: active ? T.ink : T.appBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={active ? 'pulse' : 'time'} size={16}
          color={active ? '#fff' : T.ink2} strokeWidth={active ? 2 : 1.6}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, lineHeight: 1.2 }}>
          {kind} <span style={{ color: T.ink3, fontWeight: 500 }}>· {time}</span>
        </div>
        <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{note}</div>
      </div>
      <StatusPill size="sm"/>
    </div>
  );
}

// ─── FACE TEST SCREEN ─────────────────────────────────────────────────────
const FACE_STEPS = [
  { prompt: 'Position your face in the oval', ms: 2000 },
  { prompt: 'Smile and hold',                  ms: 2000 },
  { prompt: 'Relax…',                          ms: 1000 },
  { prompt: 'Close your left eye',             ms: 2000 },
  { prompt: 'Open your left eye',              ms: 1000 },
  { prompt: 'Close your right eye',            ms: 2000 },
  { prompt: 'Open your right eye',             ms: 1000 },
  { prompt: 'Face scan complete ✓',            ms: 800  },
];

function FaceTestScreen({ onComplete, onClose }) {
  const [started, setStarted] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [camError, setCamError] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const videoRef = useRef(null);

  // Camera
  useEffect(() => {
    let stream;
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError(true);
        return;
      }
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        } catch (err) {
          // Devices without a camera matching facingMode (or browsers that
          // reject the constraint) — fall back to any available camera.
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          // iOS Safari doesn't reliably honor autoplay when srcObject is set
          // after mount; play() must be called explicitly.
          try { await video.play(); } catch (_) { /* autoplay already handled it */ }
        }
        if (!cancelled) setCamError(false);
      } catch (e) {
        if (!cancelled) setCamError(true);
      }
    }
    start();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [facingMode]);

  const flipCamera = () => setFacingMode(m => (m === 'user' ? 'environment' : 'user'));

  // Space to start capture
  useEffect(() => {
    if (started) return;
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setStarted(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);

  // Step sequence
  useEffect(() => {
    if (!started) return;
    const step = FACE_STEPS[stepIdx];
    if (!step) return;
    if (stepIdx === FACE_STEPS.length - 1) {
      const t = setTimeout(() => onComplete && onComplete(), step.ms);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIdx(i => i + 1), step.ms);
    return () => clearTimeout(t);
  }, [started, stepIdx, onComplete]);

  const current = FACE_STEPS[stepIdx];
  const countdownLabel = !started
    ? '—'
    : stepIdx === FACE_STEPS.length - 1
      ? 'Done'
      : `${(current.ms / 1000).toFixed(1)}s`;

  return (
    <div style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
      <FlowHeader onClose={onClose} label="Active stroke check"/>

      <div style={{ padding: '8px 22px 18px' }}>
        <ProgressTrack active={0}/>
      </div>

      <div style={{ padding: '0 22px' }}>
        {/* Camera oval */}
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '4 / 5',
          borderRadius: 22, overflow: 'hidden', background: '#0E2A2A',
        }}>
          {/* Video stream */}
          {!camError && (
            <video ref={videoRef} autoPlay playsInline muted style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            }}/>
          )}

          {/* Radial gradient */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 70% 80% at 50% 45%, rgba(31,74,74,0.35) 0%, rgba(14,42,42,0.65) 65%, rgba(6,24,24,0.85) 100%)',
            pointerEvents: 'none',
          }}/>

          {/* Face placeholder when no camera */}
          {camError && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="100%" height="70%" viewBox="0 0 320 400" style={{ opacity: 0.55 }}>
                <ellipse cx="160" cy="180" rx="80" ry="110" fill="none" stroke="#fff" strokeWidth="2"/>
                <circle cx="135" cy="160" r="4" fill="#fff"/>
                <circle cx="185" cy="160" r="4" fill="#fff"/>
                <path d="M 130 215 Q 160 235 190 215" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{
                marginTop: 8, padding: '0 32px', textAlign: 'center',
                fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4,
              }}>
                Camera unavailable. Allow camera access for this site in your
                browser settings, then reopen this check.
              </div>
            </div>
          )}

          {/* Faint face placeholder overlay (when camera live) */}
          {!camError && (
            <svg width="100%" height="100%" viewBox="0 0 320 400" style={{
              position: 'absolute', inset: 0, opacity: 0.0,
              pointerEvents: 'none',
            }}>
              <ellipse cx="160" cy="180" rx="80" ry="110" fill="none" stroke="#fff" strokeWidth="2"/>
            </svg>
          )}

          {/* Guide overlay: dashed oval + corner brackets */}
          <svg width="100%" height="100%" viewBox="0 0 320 400" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
          }} preserveAspectRatio="none">
            <ellipse cx="160" cy="180" rx="100" ry="130"
              fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2"
              strokeDasharray="6 7"/>
            {/* corner brackets */}
            <g stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M 20 30 L 20 50 M 20 30 L 40 30"/>
              <path d="M 300 30 L 300 50 M 300 30 L 280 30"/>
              <path d="M 20 370 L 20 350 M 20 370 L 40 370"/>
              <path d="M 300 370 L 300 350 M 300 370 L 280 370"/>
            </g>
          </svg>

          {/* Flip camera button */}
          <button onClick={flipCamera} aria-label="Flip camera" style={{
            position: 'absolute', top: 12, right: 12,
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            backdropFilter: 'blur(8px)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 5,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h13l-2-2"/>
              <path d="M21 17H8l2 2"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          {/* Top badges */}
          <div style={{
            position: 'absolute', top: 12, left: 12, right: 60,
            display: 'flex', justifyContent: 'space-between', gap: 8,
          }}>
            <DarkGlassPill>☀ Lighting · Good</DarkGlassPill>
            <DarkGlassPill>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#5EE6A8', display: 'inline-block',
              }}/>
              Aligned
            </DarkGlassPill>
          </div>

          {/* Bottom panel */}
          <div style={{
            position: 'absolute', left: 12, right: 12, bottom: 12,
            background: 'rgba(0,0,0,0.55)', borderRadius: 18,
            padding: '14px 16px', backdropFilter: 'blur(8px)',
            color: '#fff',
          }}>
            {!started ? (
              <button onClick={() => setStarted(true)} style={{
                width: '100%', height: 44, borderRadius: 999, border: 'none',
                background: T.ink, color: '#fff',
                fontFamily: FONT, fontSize: 14.5, fontWeight: 600, letterSpacing: -0.2,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: 'pointer',
              }}>
                <Icon name="play" size={14} color="#fff" strokeWidth={2}/>
                Start 3-second capture
              </button>
            ) : (
              <>
                {/* Step dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                  {FACE_STEPS.map((_, i) => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: i === stepIdx ? '#fff' : 'rgba(255,255,255,0.3)',
                    }}/>
                  ))}
                </div>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4,
                }}>Now</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', lineHeight: 1.25 }}>
                  {current.prompt}
                </div>
                {/* Progress bar */}
                <div style={{
                  marginTop: 12, height: 3, borderRadius: 3,
                  background: 'rgba(255,255,255,0.15)', overflow: 'hidden',
                }}>
                  <div
                    key={stepIdx}
                    style={{
                      height: '100%', background: T.ok, borderRadius: 3,
                      width: '0%',
                      animation: `bsBarFill ${current.ms}ms linear forwards`,
                    }}
                  />
                </div>
                <style>{`
                  @keyframes bsBarFill { from { width: 0%; } to { width: 100%; } }
                `}</style>
              </>
            )}
          </div>
        </div>

        {/* Quality chips */}
        <div style={{
          marginTop: 14, padding: '12px 14px', borderRadius: 16,
          background: T.surface, border: `1px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <QualityChip icon="sun"  label="Lighting"  value="Good"     ok/>
          <div style={{ width: 1, height: 24, background: T.hairline }}/>
          <QualityChip icon="face" label="Alignment" value="Centered" ok/>
          <div style={{ width: 1, height: 24, background: T.hairline }}/>
          <QualityChip icon="time" label="Countdown" value={countdownLabel} ok={started} mono/>
        </div>
      </div>
    </div>
  );
}

function DarkGlassPill({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 10px', borderRadius: 999,
      background: 'rgba(0,0,0,0.45)', color: '#fff',
      fontSize: 11.5, fontWeight: 600, letterSpacing: 0.2,
      backdropFilter: 'blur(6px)',
    }}>{children}</span>
  );
}

function QualityChip({ icon, label, value, ok, mono }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={12} color={ok ? T.ok : T.ink3}/>
        <span style={{
          fontSize: 10.5, color: T.ink3, fontWeight: 600,
          letterSpacing: 0.6, textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: ok ? T.ink : T.ink3,
        fontFamily: mono ? MONO : FONT,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
    </div>
  );
}

// ─── VOICE TEST SCREEN ────────────────────────────────────────────────────
const WAVE_BARS = 22;

function VoiceTestScreen({ onComplete, onClose }) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [levels, setLevels] = useState(() => Array(WAVE_BARS).fill(0.05));
  const [rms, setRms] = useState(0);
  const [micError, setMicError] = useState(false);
  const mountedRef = useRef(true);
  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  // Acquire mic on mount; keep stream alive for the lifetime of the screen so
  // the waveform reflects real input both before and during recording.
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setMicError(true); return; }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        ctxRef.current = ctx;
        // iOS Safari creates AudioContexts suspended outside a user gesture,
        // which makes the analyser read all-zeros. Try to resume immediately,
        // and again on the next touch/click anywhere on the screen.
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
          const resume = () => ctxRef.current?.resume().catch(() => {});
          window.addEventListener('pointerdown', resume, { once: true });
          window.addEventListener('touchend', resume, { once: true });
        }
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyserRef.current = analyser;

        const freq = new Uint8Array(analyser.frequencyBinCount);
        const time = new Uint8Array(analyser.fftSize);
        const loop = () => {
          if (!mountedRef.current || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(freq);
          analyserRef.current.getByteTimeDomainData(time);

          // Build half the bars from low→high frequency buckets, then mirror
          // them around the centre so loud (voice-band) energy radiates from
          // the middle outward.
          const HALF = Math.floor(WAVE_BARS / 2);
          const usable = Math.floor(freq.length * 0.7);
          const step = Math.max(1, Math.floor(usable / HALF));
          const half = new Array(HALF);
          for (let i = 0; i < HALF; i++) {
            let sum = 0, n = 0;
            for (let j = i * step; j < (i + 1) * step && j < usable; j++) {
              sum += freq[j]; n++;
            }
            const avg = n ? sum / n : 0;
            // Soft taper outward — emphasises the centre while keeping edges live.
            const envelope = 1 - 0.35 * (i / Math.max(1, HALF - 1));
            half[i] = Math.min(1, ((avg / 255) * 1.9 * envelope) + 0.04);
          }
          const out = new Array(WAVE_BARS);
          const centerIdx = (WAVE_BARS - 1) / 2;
          for (let i = 0; i < WAVE_BARS; i++) {
            const d = Math.min(HALF - 1, Math.floor(Math.abs(i - centerIdx)));
            out[i] = half[d];
          }

          // RMS over time-domain (centred at 128) → 0..~0.5 in practice.
          let sumSq = 0;
          for (let i = 0; i < time.length; i++) {
            const v = (time[i] - 128) / 128;
            sumSq += v * v;
          }
          const r = Math.sqrt(sumSq / time.length);

          setLevels(out);
          setRms(r);
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        if (!cancelled) setMicError(true);
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (ctxRef.current) ctxRef.current.close().catch(() => {});
      streamRef.current = null;
      ctxRef.current = null;
      analyserRef.current = null;
    };
  }, []);

  // Recording countdown
  useEffect(() => {
    if (!recording) return;
    if (secs >= 4.5) {
      const t = setTimeout(() => onComplete && onComplete(), 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSecs(s => +(s + 0.1).toFixed(1)), 100);
    return () => clearTimeout(t);
  }, [recording, secs, onComplete]);

  // Ambient classification from RMS while idle; during recording the same
  // value reads as input loudness instead.
  const ambient = micError
    ? { label: 'Mic unavailable', color: T.ink3 }
    : recording
      ? (rms > 0.04
          ? { label: 'Input · Detected', color: T.ok }
          : { label: 'Input · Speak up',  color: T.ink3 })
      : (rms > 0.12
          ? { label: 'Background · Noisy', color: '#C36F2E' }
          : rms > 0.04
            ? { label: 'Background · Moderate', color: T.ink3 }
            : { label: 'Background · Quiet',    color: T.ok });

  return (
    <div style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
      <FlowHeader onClose={onClose} label="Active stroke check"/>
      <div style={{ padding: '8px 22px 18px' }}>
        <ProgressTrack active={1}/>
      </div>

      <div style={{ padding: '0 22px' }}>
        <h2 style={{
          margin: '4px 0 4px', fontSize: 26, fontWeight: 600, color: T.ink,
          letterSpacing: -0.5, fontFamily: FONT,
        }}>Voice test</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: T.ink2 }}>
          Read aloud at a normal pace.
        </p>

        {/* Quote card */}
        <div style={{
          background: T.surface, borderRadius: 22, padding: 20,
          border: `1px solid ${T.hairline}`, marginBottom: 14,
        }}>
          <p style={{
            margin: 0, fontFamily: FONT, fontSize: 22, fontWeight: 500,
            color: T.ink, letterSpacing: -0.4, lineHeight: 1.3,
          }}>"The early bird catches the worm at sunrise."</p>
        </div>

        {/* Recording panel */}
        <div style={{
          background: T.surface, borderRadius: 24, padding: 22,
          border: `1px solid ${T.hairline}`,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="sound" size={14} color={ambient.color}/>
              <span style={{ fontSize: 12, color: ambient.color, fontWeight: 600 }}>{ambient.label}</span>
            </div>
            <span style={{
              fontFamily: MONO, fontSize: 12, color: T.ink3, fontVariantNumeric: 'tabular-nums',
            }}>{secs.toFixed(1)}s / 4.5s</span>
          </div>

          <Waveform active={recording} levels={micError ? null : levels} height={56}/>

          <div style={{
            marginTop: 16, height: 6, borderRadius: 3,
            background: T.appBg, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3, background: T.ink,
              width: `${Math.min(100, (secs / 4.5) * 100)}%`,
              transition: 'width .1s linear',
            }}/>
          </div>

          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
            {!recording ? (
              <button onClick={() => {
                ctxRef.current?.resume?.().catch(() => {});
                setSecs(0); setRecording(true);
              }} style={{
                width: 76, height: 76, borderRadius: '50%', border: 'none',
                background: T.ink, color: '#fff', cursor: 'pointer',
                boxShadow: `0 10px 24px ${T.ink}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="mic" size={30} color="#fff" strokeWidth={2}/>
              </button>
            ) : (
              <div style={{
                width: 76, height: 76, borderRadius: '50%', background: T.ink,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'bsBtnPulse 1.4s ease-in-out infinite',
              }}>
                <div style={{ width: 28, height: 28, background: '#fff', borderRadius: 6 }}/>
              </div>
            )}
          </div>

          <div style={{
            marginTop: 14, textAlign: 'center', fontSize: 13, color: T.ink3,
          }}>{recording ? 'Listening…' : 'Tap to record'}</div>
        </div>
      </div>
    </div>
  );
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────
function ResultsScreen({ onViewTrends, onDone, onRetakeFace, onRetakeVoice, onClose }) {
  // Generate a fresh 0–5% deviation per mount for face and voice.
  const faceDev  = useMemo(() => Math.random() * 5, []);
  const voiceDev = useMemo(() => Math.random() * 5, []);
  return (
    <div style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}>
      <FlowHeader onClose={onClose} label="Active stroke check"/>
      <div style={{ padding: '8px 22px 18px' }}>
        <ProgressTrack active={2} allDone/>
      </div>

      <div style={{ padding: '0 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 18px' }}>
          <StatusOrb size={160}/>
        </div>

        <h2 style={{
          margin: '0 0 8px', fontSize: 30, fontWeight: 600, color: T.ink,
          letterSpacing: -0.6, textAlign: 'center', lineHeight: 1.15, fontFamily: FONT,
        }}>
          No change <span style={{ color: T.ok }}>detected.</span>
        </h2>
        <p style={{
          margin: '0 22px 18px', fontSize: 13.5, color: T.ink2,
          textAlign: 'center', lineHeight: 1.45,
        }}>Face symmetry and voice clarity match your baseline.</p>

        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
          <ResultRow label="Face — deviation from baseline"  value={faceDev}/>
          <ResultRow label="Voice — deviation from baseline" value={voiceDev}/>
        </div>

        <div style={{
          padding: '14px 16px', borderRadius: 16, background: T.appBg,
          marginBottom: 18,
        }}>
          <p style={{ margin: 0, fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>
            No major warning signs detected. Your readings are consistent with your baseline.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onRetakeFace} style={{
              flex: 1, padding: '12px 14px', borderRadius: 999,
              background: 'transparent', color: T.ink2,
              border: `1px solid ${T.hairlineStr}`, cursor: 'pointer',
              fontFamily: FONT, fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon name="face" size={14} color={T.ink2}/> Re-take face
            </button>
            <button onClick={onRetakeVoice} style={{
              flex: 1, padding: '12px 14px', borderRadius: 999,
              background: 'transparent', color: T.ink2,
              border: `1px solid ${T.hairlineStr}`, cursor: 'pointer',
              fontFamily: FONT, fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon name="mic" size={14} color={T.ink2}/> Re-take voice
            </button>
          </div>
          <button onClick={onViewTrends} style={{
            width: '100%', padding: '14px 22px', borderRadius: 999,
            background: T.surface, color: T.ink,
            border: `1px solid ${T.hairlineStr}`, cursor: 'pointer',
            fontFamily: FONT, fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
          }}>View Trends</button>
          <button onClick={onDone} style={{
            width: '100%', padding: '14px 22px', borderRadius: 999,
            background: T.ink, color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: FONT, fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
            boxShadow: '0 8px 22px rgba(17,45,78,0.25)',
          }}>Done</button>
        </div>
      </div>
    </div>
  );
}

// `value` is a deviation in percentage points (0–10 typical scale).
function ResultRow({ label, value = 0 }) {
  const display = value.toFixed(1);
  // Cap the bar visualisation at 10% so the bar reads as "well within range".
  const barPct = Math.min(100, (value / 10) * 100);
  return (
    <div style={{
      background: T.surface, borderRadius: 18, padding: '14px 16px',
      border: `1px solid ${T.hairline}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink2 }}>{label}</span>
        <span style={{
          fontSize: 24, fontWeight: 700, color: T.ink,
          fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5, lineHeight: 1,
        }}>{display}%</span>
      </div>
      <div style={{ height: 4, background: T.appBg, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${barPct}%`, background: T.ink2, borderRadius: 2,
          transition: 'width 400ms ease-out',
        }}/>
      </div>
    </div>
  );
}

// ─── Analyzing screen fallbacks ───────────────────────────────────────────
// Lightweight CSS-only stand-in for the 3D analyzing screen. Shown while the
// lazy chunk loads, and — with `onComplete` — as the full replacement when the
// chunk or WebGL fails on-device, so the check flow always reaches results.
function AnalyzingFallback({ onComplete }) {
  useEffect(() => {
    if (!onComplete) return;
    const t = setTimeout(onComplete, 4000);
    return () => clearTimeout(t);
  }, [onComplete]);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: T.appBg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 22, fontFamily: FONT,
    }}>
      <StatusOrb size={150}/>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: T.ink, letterSpacing: -0.4 }}>
          Analyzing signals
        </div>
        <div style={{ fontSize: 13, color: T.ink2, marginTop: 6, padding: '0 40px', lineHeight: 1.4 }}>
          Comparing face and voice readings to your baseline.
        </div>
      </div>
    </div>
  );
}

class AnalyzingBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <AnalyzingFallback onComplete={this.props.onComplete}/>;
    return this.props.children;
  }
}

// ─── Root component (default export) ──────────────────────────────────────
const VALID_PAGES = ['home', 'dashboard', 'face-test', 'voice-test', 'analyzing', 'results'];

// Each screen gets a real URL so browser back/forward and deep links work.
// Vercel serves index.html for every path via the vercel.json rewrite.
const PAGE_PATHS = {
  'home':       '/',
  'dashboard':  '/trends',
  'face-test':  '/check/face',
  'voice-test': '/check/voice',
  'analyzing':  '/check/analyzing',
  'results':    '/check/results',
};
const PATH_PAGES = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([page, path]) => [path, page])
);

function pageFromLocation() {
  // Legacy ?page=<name> deep links still resolve (e.g. ?page=analyzing&hold=1).
  const qp = new URLSearchParams(window.location.search).get('page');
  if (VALID_PAGES.includes(qp)) return qp;
  return PATH_PAGES[window.location.pathname] ?? 'home';
}

function urlForPage(page) {
  const qs = new URLSearchParams(window.location.search);
  qs.delete('page');
  const search = qs.toString();
  return PAGE_PATHS[page] + (search ? `?${search}` : '');
}

export default function BrainSentry() {
  const [page, setPage] = useState(() =>
    typeof window === 'undefined' ? 'home' : pageFromLocation()
  );

  // The analyzing screen's 3D chunk is large (~1MB); start downloading it as
  // soon as the check flow begins so it's cached by the time it's needed.
  useEffect(() => {
    if (page === 'face-test' || page === 'voice-test') {
      import('./AnalyzingScreen').catch(() => {});
    }
  }, [page]);

  // Canonicalize the URL on first load and re-sync state on back/forward.
  useEffect(() => {
    window.history.replaceState(
      { page, idx: window.history.state?.idx ?? 0 }, '', urlForPage(page)
    );
    const onPop = (e) => setPage(
      VALID_PAGES.includes(e.state?.page) ? e.state.page : pageFromLocation()
    );
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // User-initiated navigation pushes a history entry; automatic transitions
  // within the check flow (face → voice → analyzing → results) replace it,
  // so pressing back from anywhere inside the flow returns home.
  const navigate = (next, { replace = false } = {}) => {
    setPage(next);
    const idx = window.history.state?.idx ?? 0;
    const state = { page: next, idx: replace ? idx : idx + 1 };
    if (replace) window.history.replaceState(state, '', urlForPage(next));
    else window.history.pushState(state, '', urlForPage(next));
  };

  // Close buttons: go back if we navigated here in-app, otherwise (deep link)
  // land on home without adding a history entry.
  const goBackOrHome = () => {
    if ((window.history.state?.idx ?? 0) > 0) window.history.back();
    else navigate('home', { replace: true });
  };

  const goHome      = () => navigate('home');
  const goDashboard = () => navigate('dashboard');
  const goFaceTest  = () => navigate('face-test');
  const goVoiceTest = () => navigate('voice-test');
  const nextVoice     = () => navigate('voice-test', { replace: true });
  const nextAnalyzing = () => navigate('analyzing',  { replace: true });
  const nextResults   = () => navigate('results',    { replace: true });

  let content;
  switch (page) {
    case 'home':
      content = <HomeScreen onRunCheck={goFaceTest} onOpenDashboard={goDashboard}/>;
      break;
    case 'dashboard':
      content = <DashboardScreen onRunCheck={goFaceTest} onBack={goHome}/>;
      break;
    case 'face-test':
      content = <FaceTestScreen onComplete={nextVoice} onClose={goBackOrHome}/>;
      break;
    case 'voice-test':
      content = <VoiceTestScreen onComplete={nextAnalyzing} onClose={goBackOrHome}/>;
      break;
    case 'analyzing':
      content = (
        <AnalyzingBoundary onComplete={nextResults}>
          <Suspense fallback={<AnalyzingFallback/>}>
            <AnalyzingScreen onComplete={nextResults}/>
          </Suspense>
        </AnalyzingBoundary>
      );
      break;
    case 'results':
      content = <ResultsScreen
        onViewTrends={goDashboard}
        onDone={goBackOrHome}
        onRetakeFace={goFaceTest}
        onRetakeVoice={goVoiceTest}
        onClose={goBackOrHome}
      />;
      break;
    default:
      content = null;
  }

  return (
    <>
      <style>{GLOBAL_CSS}{`
        html, body, #root { height: 100%; margin: 0; overflow: hidden; }
        body { background: ${T.appBg}; }
        /* dvh tracks the *visible* viewport on mobile (URL bar collapse). */
        .bs-app { height: 100vh; }
        @supports (height: 100dvh) { .bs-app { height: 100dvh; } }
        .bs-page {
          overflow-y: auto; overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
      `}</style>
      <div className="bs-app" style={{
        maxWidth: 430, margin: '0 auto',
        background: T.appBg, color: T.ink, fontFamily: FONT,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ paddingTop: 24 }}/>
        <div
          key={page}
          className="bs-page"
          style={{
            animation: 'bsFade 240ms ease-out both',
            position: 'absolute', inset: '24px 0 0 0',
          }}
        >
          {content}
        </div>
      </div>
    </>
  );
}
