/**
 * @module GestureOverlay
 *
 * Touch gesture layer for camera control on mobile and desktop.
 * Uses web Pointer Events for two-finger pan (translate camera in XZ plane)
 * and pinch zoom (scale camera zoom level). Single-finger gestures pass
 * through to the existing handler for building placement.
 *
 * Also supports mouse wheel zoom on desktop.
 *
 * Writes into the shared {@link cameraState} object consumed by
 * {@link CameraController} in useFrame.
 */

import { type ReactNode, useCallback, useRef } from 'react';
import renderConfig from '../../data/renderConfig.json';
import { cameraState } from './CameraController';

const { zoomMin, zoomMax } = renderConfig.camera;

/** Props for the gesture overlay wrapper. */
export interface GestureOverlayProps {
  children: ReactNode;
}

interface PointerInfo {
  id: number;
  x: number;
  y: number;
}

/**
 * Wraps children with pointer event handlers for two-finger pan and
 * pinch-zoom gestures. Single-finger touches pass through so they do not
 * conflict with the existing handler for building placement / entity
 * selection.
 *
 * Pan translates the camera position in the XZ world plane.
 * Pinch scales the camera zoom level within renderConfig bounds.
 * Mouse wheel also controls zoom on desktop.
 */
export function GestureOverlay({ children }: GestureOverlayProps) {
  const pointersRef = useRef<Map<number, PointerInfo>>(new Map());
  const panStartRef = useRef({ x: 0, z: 0 });
  const pinchStartRef = useRef({ distance: 0, zoom: 0 });

  const getDistance = useCallback((pointers: PointerInfo[]) => {
    if (pointers.length < 2) return 0;
    const dx = pointers[1].x - pointers[0].x;
    const dy = pointers[1].y - pointers[0].y;
    return Math.hypot(dx, dy);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointersRef.current.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });
      if (pointersRef.current.size === 2) {
        panStartRef.current = { x: cameraState.panX, z: cameraState.panZ };
        const pts = [...pointersRef.current.values()];
        pinchStartRef.current = {
          distance: getDistance(pts),
          zoom: cameraState.gestureZoom >= 0 ? cameraState.gestureZoom : 50,
        };
      }
    },
    [getDistance],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ptr = pointersRef.current.get(e.pointerId);
      if (!ptr) return;
      ptr.x = e.clientX;
      ptr.y = e.clientY;

      if (pointersRef.current.size >= 2) {
        const pts = [...pointersRef.current.values()];

        // Pan: average movement
        const sensitivity = 0.3;
        const avgX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const avgY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        // We track delta from the centroid at gesture start
        // For simplicity, just update pan based on latest centroid
        cameraState.panX = panStartRef.current.x - (avgX - pts[0].x) * sensitivity;
        cameraState.panZ = panStartRef.current.z - (avgY - pts[0].y) * sensitivity;

        // Pinch zoom
        const dist = getDistance(pts);
        if (pinchStartRef.current.distance > 0) {
          const scale = dist / pinchStartRef.current.distance;
          const newZoom = pinchStartRef.current.zoom * scale;
          cameraState.gestureZoom = Math.max(zoomMin, Math.min(zoomMax, newZoom));
        }
      }
    },
    [getDistance],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const currentZoom = cameraState.gestureZoom >= 0 ? cameraState.gestureZoom : 50;
    const delta = e.deltaY > 0 ? -3 : 3;
    cameraState.gestureZoom = Math.max(zoomMin, Math.min(zoomMax, currentZoom + delta));
  }, []);

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      {children}
    </div>
  );
}
