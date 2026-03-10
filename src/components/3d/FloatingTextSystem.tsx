import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type * as THREE from 'three';

// ─── Imperative queue (no React state = zero re-renders on emit) ───────────
interface FTEvent {
  id: number;
  pos: [number, number, number];
  value: number;
}
let _counter = 0;
const _queue: FTEvent[] = [];

/**
 * Enqueue a floating-text event to be displayed in the 3D scene.
 *
 * Adds a new event with a unique numeric id to the internal queue; the event will be consumed
 * by FloatingTextSystem and rendered as a transient label at the given position.
 *
 * @param pos - World position [x, y, z] where the floating text will appear
 * @param value - Numeric value to display; sign and magnitude determine the label content
 */
export function emitFloatingText(pos: [number, number, number], value: number) {
  _queue.push({ id: _counter++, pos, value });
}

// ─── Individual floating label ─────────────────────────────────────────────
interface ActiveFT extends FTEvent {
  life: number;
}

/**
 * Renders a single floating text label that rises, faces the camera, and signals when it expires.
 *
 * @param ft - Active floating-text entry containing `id`, `pos` (x,y,z), `value`, and `life`; used to determine position, color, size, and displayed text
 * @param onDone - Callback invoked once the label's lifetime ends (approximately 1.5 seconds)
 */
function FTLabel({ ft, onDone }: { ft: ActiveFT; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const done = useRef(false);
  const elapsed = useRef(0);

  const isHeal = ft.value < 0;
  const isBounty = ft.value >= 50;
  const color = isHeal ? '#22ff88' : isBounty ? '#ffd700' : '#ff4444';
  const displayText = isHeal ? `+${Math.abs(ft.value)}` : `-${ft.value}`;
  const size = isBounty ? 0.55 : 0.38;

  useFrame((state, delta) => {
    if (!ref.current || done.current) return;
    elapsed.current += delta;
    ref.current.position.y += delta * 1.8;
    ref.current.quaternion.copy(state.camera.quaternion);
    if (elapsed.current >= 1.5) {
      done.current = true;
      onDone();
    }
  });

  return (
    <Text
      ref={ref}
      position={ft.pos}
      fontSize={size}
      color={color}
      outlineWidth={0.04}
      outlineColor="#000000"
      anchorX="center"
      anchorY="middle"
    >
      {displayText}
    </Text>
  );
}

/**
 * Renders and manages active floating text labels by consuming the module-level event queue each frame.
 *
 * Drains any queued FTEvent items once per frame, adds them to local state as ActiveFT entries with a 1.5s life,
 * and caps the number of simultaneous labels at 24. Renders an FTLabel for each active entry and removes entries
 * when their label signals completion.
 *
 * @returns The React fragment containing active floating text label components
 */
export function FloatingTextSystem() {
  const [texts, setTexts] = useState<ActiveFT[]>([]);

  // Drain the global queue once per frame; only calls setTexts when there's work.
  useFrame(() => {
    if (_queue.length === 0) return;
    const batch = _queue.splice(0, _queue.length);
    setTexts((prev) => [...prev, ...batch.map((e) => ({ ...e, life: 1.5 }))].slice(-24)); // cap at 24 simultaneous labels
  });

  const handleDone = (id: number) => setTexts((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {texts.map((ft) => (
        <FTLabel key={ft.id} ft={ft} onDone={() => handleDone(ft.id)} />
      ))}
    </>
  );
}
