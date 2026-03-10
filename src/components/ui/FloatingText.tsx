import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';

interface FloatingTextProps {
  value: number;
  position: [number, number, number];
  onDone: () => void;
}

export function FloatingText({ value, position, onDone }: FloatingTextProps) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  const done = useRef(false);

  const isHeal = value < 0;
  const color = isHeal ? '#00ff88' : value === 0 ? '#ffd700' : '#ff4444';
  const displayText = isHeal ? `+${Math.abs(value)}` : `-${value}`;

  useFrame((state, delta) => {
    if (!ref.current || done.current) return;
    elapsed.current += delta;

    ref.current.position.y += delta * 1.5;
    // Billboard effect
    ref.current.quaternion.copy(state.camera.quaternion);

    if (elapsed.current >= 1.5) {
      done.current = true;
      onDone();
    }
  });

  return (
    <Text
      ref={ref}
      position={position}
      fontSize={0.4}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.02}
      outlineColor="#000000"
    >
      {displayText}
    </Text>
  );
}
