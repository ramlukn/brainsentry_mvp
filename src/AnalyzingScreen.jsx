import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// ── Procedural cortex-bump geometry ───────────────────────────────────────
// Multi-octave pseudo-noise (no external dep). High-frequency components are
// weighted heavily so the surface reads as cortex ridges, not a wobbly blob.
function brainNoise(x, y, z, seed) {
  const a = Math.sin(x * 4   + seed)  * Math.cos(y * 3.5)         * Math.sin(z * 4);
  const b = Math.sin(x * 11  + 1.5)   * Math.cos(y * 10 - seed)   * Math.sin(z * 11);
  const c = Math.sin(x * 22  + 2.7)   * Math.cos(y * 20)          * Math.sin(z * 22 + seed);
  return 0.30 * a + 0.40 * b + 0.30 * c;
}

function makeHemisphereGeometry({ seed = 0, amount = 0.16 } = {}) {
  const g = new THREE.SphereGeometry(1, 192, 192);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = brainNoise(v.x, v.y, v.z, seed);
    const r = 1 + n * amount;
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  g.computeVertexNormals();
  return g;
}

// Palette aligned with BrainSentry tokens
const APP_BG    = '#F9F7F7';
const BRAIN     = '#3F72AF'; // T.ink2
const BRAIN_HI  = '#7A92B5'; // T.ink3 — secondary tint for depth
const INK       = '#112D4E';
const INK2      = '#3F72AF';
const INK3      = '#7A92B5';
const HOT       = '#C36F2E'; // warm activation accent

// ── Brain mesh from /brain.glb (when supplied) ────────────────────────────
function BrainModel() {
  const { scene } = useGLTF('/brain.glb');
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.22; });

  // Recolor whatever the .glb ships with to match the BrainSentry palette.
  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.material = new THREE.MeshStandardMaterial({
          color: BRAIN,
          roughness: 0.45,
          metalness: 0.05,
        });
      }
    });
  }, [scene]);

  return <primitive ref={ref} object={scene} scale={1.6} position={[0, -0.1, 0]} />;
}

// ── Procedural fallback brain ─────────────────────────────────────────────
// Two noise-displaced hemispheres with a longitudinal fissure, plus a small
// cerebellum + brain-stem. Looks recognisably brain-like; no asset required.
function FallbackBrain() {
  const ref = useRef();
  const leftGeom  = useMemo(() => makeHemisphereGeometry({ seed: 0,  amount: 0.13 }), []);
  const rightGeom = useMemo(() => makeHemisphereGeometry({ seed: 19, amount: 0.13 }), []);
  const cerebGeom = useMemo(() => makeHemisphereGeometry({ seed: 7,  amount: 0.08 }), []);

  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.22; });

  // depthWrite: true so the displaced cortex back-faces are correctly occluded
  // by front-faces — without it the noise ridges stack visibly as contour rings.
  const cortex = useMemo(() => new THREE.MeshStandardMaterial({
    color: BRAIN, roughness: 0.55, metalness: 0.04,
    transparent: true, opacity: 0.62,
  }), []);
  const cortexAlt = useMemo(() => new THREE.MeshStandardMaterial({
    color: BRAIN_HI, roughness: 0.6, metalness: 0.04,
    transparent: true, opacity: 0.7,
  }), []);

  return (
    <group ref={ref} rotation={[0.08, 0, 0]} scale={0.78} position={[0, 0.32, 0]}>
      {/* Left hemisphere */}
      <mesh
        geometry={leftGeom}
        material={cortex}
        position={[-0.22, 0.02, 0]}
        rotation={[0, 0, -0.05]}
        scale={[0.78, 0.78, 1.05]}
      />
      {/* Right hemisphere — gap between the two creates the longitudinal fissure */}
      <mesh
        geometry={rightGeom}
        material={cortex}
        position={[ 0.22, 0.02, 0]}
        rotation={[0, 0, 0.05]}
        scale={[0.78, 0.78, 1.05]}
      />
      {/* Cerebellum */}
      <mesh
        geometry={cerebGeom}
        material={cortexAlt}
        position={[0, -0.55, -0.55]}
        scale={[0.5, 0.34, 0.5]}
      />
      {/* Brain stem */}
      <mesh position={[0, -0.82, -0.38]} rotation={[0.55, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.4, 32]} />
        <meshStandardMaterial
          color={BRAIN_HI} roughness={0.55} metalness={0.04}
          transparent opacity={0.7}
        />
      </mesh>
    </group>
  );
}

// ── Glow regions inside the brain (visible through the translucent cortex)
function GlowRegion({ position, phase, radius = 0.18, color = HOT, speed = 0.85 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + phase;
    const pulse = 0.5 + 0.5 * Math.sin(t * speed);
    ref.current.material.emissiveIntensity = 0.4 + pulse * 1.6;
    ref.current.scale.setScalar(0.7 + pulse * 0.4);
    ref.current.material.opacity = 0.35 + pulse * 0.4;
  });
  return (
    <mesh position={position} ref={ref} renderOrder={-1}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        toneMapped={false}
        transparent
        opacity={0.5}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function GlowRegions() {
  // Diffuse internal "activations" at staggered phases so the brain
  // appears to light up in different areas over time.
  return (
    <>
      <GlowRegion position={[ 0.45,  0.30,  0.20]} radius={0.20} phase={0.0} speed={0.85}/>
      <GlowRegion position={[-0.40,  0.10,  0.30]} radius={0.17} phase={1.5} speed={0.95} color="#E89C5C"/>
      <GlowRegion position={[ 0.10,  0.40, -0.20]} radius={0.16} phase={2.9} speed={0.80}/>
      <GlowRegion position={[-0.20, -0.10,  0.40]} radius={0.15} phase={4.2} speed={1.05} color="#D88B47"/>
    </>
  );
}

// ── Error boundary: drop to FallbackBrain if /brain.glb is missing ────────
class BrainBoundary extends React.Component {
  constructor(p) { super(p); this.state = { errored: false }; }
  static getDerivedStateFromError() { return { errored: true }; }
  componentDidCatch() {}
  render() {
    if (this.state.errored) return this.props.fallback;
    return this.props.children;
  }
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

// ── Animated ECG trace standing in for the progress bar ──────────────────
// Generates a string of `beats` P-QRS-T cycles across `w` units in `h` units
// of height, then reveals the whole line left-to-right over the duration.
function makeEcgPath(beats, w, h) {
  const cyc = w / beats;
  const mid = h / 2;
  let d = `M 0 ${mid}`;
  for (let i = 0; i < beats; i++) {
    const x = i * cyc;
    // P wave
    d += ` L ${x + 0.10 * cyc} ${mid}`;
    d += ` L ${x + 0.13 * cyc} ${mid - 2}`;
    d += ` L ${x + 0.16 * cyc} ${mid}`;
    // Flat to Q
    d += ` L ${x + 0.28 * cyc} ${mid}`;
    // Q · R · S spike
    d += ` L ${x + 0.30 * cyc} ${mid + 1.5}`;
    d += ` L ${x + 0.32 * cyc} ${mid - 12}`;
    d += ` L ${x + 0.34 * cyc} ${mid + 4}`;
    d += ` L ${x + 0.40 * cyc} ${mid}`;
    // T wave
    d += ` L ${x + 0.55 * cyc} ${mid - 3}`;
    d += ` L ${x + 0.62 * cyc} ${mid}`;
    // Flat to end of cycle
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
        {/* faint baseline so the line has a visual track */}
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
  const [phase, setPhase] = useState(0); // 0 = analyzing, 1 = finalizing

  // `?hold=1` pins the screen open so you can inspect it without it
  // auto-advancing. Dev-only convenience.
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
        camera={{ position: [0, 0.30, 7.6], fov: 28 }}
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <ambientLight intensity={0.7}/>
        <directionalLight position={[3, 4, 5]}  intensity={1.3} color="#FFF8EE"/>
        <directionalLight position={[-4, -2, 2]} intensity={0.55} color="#DBE2EF"/>
        <BrainBoundary fallback={<FallbackBrain/>}>
          <Suspense fallback={<FallbackBrain/>}>
            <BrainModel/>
          </Suspense>
        </BrainBoundary>
        <GlowRegions/>
        <EffectComposer>
          <Bloom intensity={0.35} luminanceThreshold={0.75} luminanceSmoothing={0.25} mipmapBlur/>
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
        position: 'absolute', left: 0, right: 0, bottom: 130,
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

// Preload only if the file is reachable — silently skip in dev when missing.
try { useGLTF.preload('/brain.glb'); } catch (_) {}
