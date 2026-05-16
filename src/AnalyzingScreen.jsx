import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';

// Palette aligned with BrainSentry tokens
const APP_BG = '#F9F7F7';
const INK    = '#112D4E';
const INK2   = '#3F72AF';
const INK3   = '#7A92B5';
const HOT    = '#C36F2E';
// Slightly brighter blue used for the flares so they pop against navy
// continents without leaving the palette.
const SIGNAL = '#5891D6';

const AXIAL_TILT_RAD = (23.5 * Math.PI) / 180; // Earth's axial tilt

// ── lat/lng (degrees) → 3D position on a sphere of radius r ──────────────
function latLngToVec3(lat, lng, r = 1) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  ];
}

// ── Great-circle arc between two surface points, bowed outward ────────────
function arcPoints(p1, p2, height = 0.32, segments = 96) {
  const v1 = new THREE.Vector3(...p1);
  const v2 = new THREE.Vector3(...p2);
  const angle = v1.angleTo(v2);
  const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();
  const out = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = v1.clone().applyAxisAngle(axis, t * angle);
    const lift = Math.sin(t * Math.PI) * height;
    p.multiplyScalar(1 + lift);
    out.push([p.x, p.y, p.z]);
  }
  return out;
}

// ── City coordinates (lat, lng in degrees) ────────────────────────────────
const CITIES = {
  boston:  { lat:  42.36, lng:  -71.06 },
  jakarta: { lat:  -6.21, lng:  106.85 },
  geneva:  { lat:  46.20, lng:    6.14 },
};

// ── A drawing-in arc between two cities, looping ──────────────────────────
function AnimatedArc({ from, to, color = INK2, drawMs = 1600, holdMs = 700, phaseMs = 0 }) {
  const points = useMemo(() => {
    const p1 = latLngToVec3(from.lat, from.lng, 1);
    const p2 = latLngToVec3(to.lat,   to.lng,   1);
    return arcPoints(p1, p2, 0.32, 96);
  }, [from, to]);

  // Total arc length so the dash math is in world units.
  const total = useMemo(() => {
    let l = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      l += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    }
    return l;
  }, [points]);

  const lineRef = useRef();

  useFrame(({ clock }) => {
    const line = lineRef.current;
    if (!line || !line.material) return;
    const cycle = drawMs + holdMs;
    const tMs = ((clock.elapsedTime * 1000 + phaseMs) % cycle);
    const progress = Math.min(1, tMs / drawMs);
    line.material.dashSize = total * progress + 0.0001;
    line.material.gapSize  = total * (1 - progress) + 0.0001;
  });

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={1.8}
      transparent
      opacity={0.95}
      toneMapped={false}
      dashed
      dashScale={1}
      dashSize={0.001}
      gapSize={total}
    />
  );
}

// ── Flare: pulsing core + expanding halo on the globe surface ────────────
function Flare({ lat, lng, color = SIGNAL, phase = 0, speed = 1.2, core = 0.028, haloMax = 5.0 }) {
  const pos = useMemo(() => latLngToVec3(lat, lng, 1.012), [lat, lng]);
  const coreRef = useRef();
  const haloRef = useRef();

  useFrame(({ clock }) => {
    if (!coreRef.current || !haloRef.current) return;
    const t = clock.elapsedTime * speed + phase;
    const pulse = (Math.sin(t) + 1) / 2; // 0..1

    coreRef.current.material.emissiveIntensity = 2 + pulse * 2.5;
    coreRef.current.scale.setScalar(0.9 + pulse * 0.2);

    const grow = 1 + pulse * (haloMax - 1);
    haloRef.current.scale.setScalar(grow);
    haloRef.current.material.opacity = 0.55 * (1 - pulse);
  });

  return (
    <group position={pos}>
      <mesh ref={coreRef} renderOrder={1}>
        <sphereGeometry args={[core, 20, 20]}/>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={3}
          toneMapped={false}
          depthTest={false}
        />
      </mesh>
      <mesh ref={haloRef} renderOrder={0}>
        <sphereGeometry args={[core * 1.6, 20, 20]}/>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

// ── Clean lat/long graticule: 12 meridians + 5 parallels ──────────────────
function Graticule({ color = INK2, opacity = 0.16 }) {
  const meridians = useMemo(() => {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const lng = i * 30 - 180;
      const pts = [];
      for (let lat = -85; lat <= 85; lat += 5) pts.push(latLngToVec3(lat, lng, 1));
      out.push(pts);
    }
    return out;
  }, []);
  const parallels = useMemo(() => {
    const out = [];
    [-60, -30, 0, 30, 60].forEach((lat) => {
      const pts = [];
      for (let lng = -180; lng <= 180; lng += 5) pts.push(latLngToVec3(lat, lng, 1));
      out.push(pts);
    });
    return out;
  }, []);
  return (
    <>
      {meridians.map((pts, i) => (
        <Line key={`m${i}`} points={pts} color={color}
          lineWidth={0.7} transparent opacity={opacity} depthWrite={false}/>
      ))}
      {parallels.map((pts, i) => (
        <Line key={`p${i}`} points={pts} color={color}
          lineWidth={i === 2 ? 1.0 : 0.7} // emphasise the equator slightly
          transparent opacity={i === 2 ? opacity + 0.04 : opacity} depthWrite={false}/>
      ))}
    </>
  );
}

// ── Build per-ring polyline data once from the land TopoJSON ─────────────
function useContinentRings(r) {
  return useMemo(() => {
    const land = feature(landTopo, landTopo.objects.land);
    const rings = [];
    const polygons = land.geometry?.coordinates
      ?? land.features?.flatMap((f) => (
        f.geometry.type === 'MultiPolygon'
          ? f.geometry.coordinates
          : [f.geometry.coordinates]
      )) ?? [];
    for (const poly of polygons) {
      for (const ring of poly) {
        // Close the ring so it draws as a complete coastline.
        const pts = ring.map(([lng, lat]) => latLngToVec3(lat, lng, r));
        if (pts.length > 1) rings.push(pts);
      }
    }
    return rings;
  }, [r]);
}

// ── Spinning, tilted continent globe ─────────────────────────────────────
function EarthGlobe() {
  const rings = useContinentRings(1.002);
  const spin = useRef();
  // Start with Indonesia (~110°E) facing the camera so the flares are
  // immediately visible during the 2.5s analyzing screen.
  useEffect(() => {
    if (spin.current) spin.current.rotation.y = Math.PI;
  }, []);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.15;
  });

  return (
    <group rotation={[0, 0, AXIAL_TILT_RAD]} position={[0, 1.5, 0]}>
      {/* Atmospheric rim glow: a slightly larger BackSide sphere only shows
          at the silhouette of the globe, producing a soft halo. */}
      <mesh scale={1.06}>
        <sphereGeometry args={[1, 64, 64]}/>
        <meshBasicMaterial
          color={SIGNAL}
          side={THREE.BackSide}
          transparent
          opacity={0.10}
          depthWrite={false}
        />
      </mesh>

      <group ref={spin}>
        {/* Sparse lat/long graticule replaces the noisy triangulated wireframe */}
        <Graticule color={INK2} opacity={0.16}/>

        {/* Continent outlines drawn as 3D polylines */}
        {rings.map((points, i) => (
          <Line
            key={i}
            points={points}
            color={INK}
            lineWidth={1.2}
            transparent
            opacity={0.95}
            toneMapped={false}
            depthWrite={false}
          />
        ))}

        {/* Four intentional flares: Boston (arc origin) + spread across the
            Indonesian archipelago so they're spatially distinct. */}
        <Flare lat={CITIES.boston.lat}  lng={CITIES.boston.lng}  phase={0.0}/>
        <Flare lat={CITIES.jakarta.lat} lng={CITIES.jakarta.lng} phase={0.7}/>  {/* Jakarta (Java) */}
        <Flare lat={ 3.59}              lng={ 98.67}             phase={1.6}/>  {/* Medan (Sumatra) */}
        <Flare lat={-5.13}              lng={119.41}             phase={2.5}/>  {/* Makassar (Sulawesi) */}

        {/* Animated arc — Boston → Jakarta */}
        <AnimatedArc from={CITIES.boston} to={CITIES.jakarta} phaseMs={0}/>
      </group>
    </group>
  );
}

// ── HTML overlay ──────────────────────────────────────────────────────────
function CornerBrackets() {
  const arm = `1.5px solid ${INK3}AA`;
  const s = { position: 'absolute', width: 22, height: 22 };
  return (
    <>
      <div style={{ ...s, top: 14,    left: 14,    borderTop: arm,    borderLeft: arm  }}/>
      <div style={{ ...s, top: 14,    right: 14,   borderTop: arm,    borderRight: arm }}/>
      <div style={{ ...s, bottom: 14, left: 14,    borderBottom: arm, borderLeft: arm  }}/>
      <div style={{ ...s, bottom: 14, right: 14,   borderBottom: arm, borderRight: arm }}/>
    </>
  );
}

// ── ECG heartbeat trace standing in for the progress bar ──────────────────
function makeEcgPath(beats, w, h) {
  const cyc = w / beats;
  const mid = h / 2;
  let d = `M 0 ${mid}`;
  for (let i = 0; i < beats; i++) {
    const x = i * cyc;
    d += ` L ${x + 0.10 * cyc} ${mid}`;
    d += ` L ${x + 0.13 * cyc} ${mid - 2}`;
    d += ` L ${x + 0.16 * cyc} ${mid}`;
    d += ` L ${x + 0.28 * cyc} ${mid}`;
    d += ` L ${x + 0.30 * cyc} ${mid + 1.5}`;
    d += ` L ${x + 0.32 * cyc} ${mid - 12}`;
    d += ` L ${x + 0.34 * cyc} ${mid + 4}`;
    d += ` L ${x + 0.40 * cyc} ${mid}`;
    d += ` L ${x + 0.55 * cyc} ${mid - 3}`;
    d += ` L ${x + 0.62 * cyc} ${mid}`;
    d += ` L ${x + cyc} ${mid}`;
  }
  return d;
}

function HeartbeatLine({ durationMs }) {
  const W = 310, H = 26, BEATS = 4;
  const d = useMemo(() => makeEcgPath(BEATS, W, H), []);
  return (
    <div style={{
      position: 'absolute', left: 60, right: 60, bottom: 84,
      height: H, pointerEvents: 'none',
    }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <line x1="0" y1={H / 2} x2={W} y2={H / 2}
          stroke="rgba(17,45,78,0.10)" strokeWidth="1"/>
        <path
          d={d}
          fill="none"
          stroke={INK}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="100"
          style={{
            strokeDasharray: '100',
            strokeDashoffset: '100',
            animation: `bsEcgTrace ${durationMs}ms linear forwards`,
          }}
        />
      </svg>
      <style>{`@keyframes bsEcgTrace { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────
const DURATION_MS = 2500;

export default function AnalyzingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);

  const hold = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('hold') === '1';

  useEffect(() => {
    if (hold) { setPhase(1); return; }
    const t1 = setTimeout(() => setPhase(1), Math.floor(DURATION_MS * 0.6));
    const t2 = setTimeout(() => onComplete && onComplete(), DURATION_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete, hold]);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: APP_BG,
      color: INK, overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
    }}>
      <Canvas
        camera={{ position: [0, 0.10, 17], fov: 26 }}
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.0}/>
        <EarthGlobe/>
        <EffectComposer>
          {/* Soft halo around the bright outlines */}
          <Bloom intensity={0.55} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur/>
        </EffectComposer>
      </Canvas>

      <CornerBrackets/>

      <div style={{
        position: 'absolute', top: 18, left: 0, right: 0,
        textAlign: 'center',
        fontSize: 10.5, fontWeight: 600, color: INK3,
        textTransform: 'uppercase', letterSpacing: 1.6,
      }}>
        Active stroke check · Step 3 of 3
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 220,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: HOT, letterSpacing: 1.8,
          textTransform: 'uppercase', marginBottom: 8,
        }}>
          {phase === 0 ? 'Zero-shot prediction' : 'Generating result'}
        </div>
        <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.4, color: INK }}>
          Analyzing signals
        </div>
        <div style={{
          fontSize: 13, color: INK2, marginTop: 6,
          padding: '0 40px', lineHeight: 1.4,
        }}>
          Comparing face and voice readings to your baseline.
        </div>
      </div>

      <HeartbeatLine durationMs={DURATION_MS}/>
    </div>
  );
}
