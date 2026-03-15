/**
 * @module ScreenFlash
 *
 * Full-screen color flash overlay triggered by boss spawns, spell casts,
 * and other dramatic game events. Reads intensity from the ECS session
 * trait and fades out via CSS transition.
 */

/**
 * Renders a full-screen translucent overlay that flashes a given color.
 * Used for boss entrances (red), spell casts, and wave transitions.
 * Pointer events pass through so gameplay is never blocked.
 *
 * @param props.color - CSS color string for the flash.
 * @param props.intensity - Flash strength from 0 (invisible) to 1+ (opaque).
 */
export function ScreenFlash({ color, intensity }: { color: string; intensity: number }) {
  if (intensity <= 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        backgroundColor: color,
        opacity: Math.min(intensity * 0.3, 0.8),
        transition: 'opacity 200ms ease-out',
      }}
      data-testid="screen-flash"
    />
  );
}
