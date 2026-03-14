/**
 * @module GestureOverlay
 *
 * Touch gesture layer for camera control on mobile devices.
 * Uses react-native-gesture-handler for two-finger pan (translate camera
 * in XZ plane) and pinch zoom (scale camera zoom level). Single-finger
 * gestures pass through to the existing PanResponder for building placement.
 *
 * Writes into the shared {@link cameraState} object consumed by
 * {@link CameraController} in useFrame.
 */
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cameraState } from './CameraController';
import renderConfig from '../../data/renderConfig.json';

const { zoomMin, zoomMax } = renderConfig.camera;

/** Props for the gesture overlay wrapper. */
export interface GestureOverlayProps {
  children: ReactNode;
}

/**
 * Wraps children with a GestureDetector that handles two-finger pan and
 * pinch-zoom gestures. Single-finger touches pass through so they do not
 * conflict with the existing PanResponder for building placement / entity
 * selection.
 *
 * Pan translates the camera position in the XZ world plane.
 * Pinch scales the camera zoom level within renderConfig bounds.
 */
export function GestureOverlay({ children }: GestureOverlayProps) {
  // Store base values at gesture start
  let panStartX = 0;
  let panStartZ = 0;
  let zoomStart = 0;

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onBegin(() => {
      panStartX = cameraState.panX;
      panStartZ = cameraState.panZ;
    })
    .onUpdate((e) => {
      // Map pixel movement to world units (scaled by zoom)
      // At default zoom ~50, 1px ~ 0.5 world units is reasonable
      const sensitivity = 0.3;
      cameraState.panX = panStartX - e.translationX * sensitivity;
      cameraState.panZ = panStartZ - e.translationY * sensitivity;
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      // Start from current gesture zoom or preset
      zoomStart = cameraState.gestureZoom >= 0 ? cameraState.gestureZoom : 50;
    })
    .onUpdate((e) => {
      const newZoom = zoomStart * e.scale;
      cameraState.gestureZoom = Math.max(zoomMin, Math.min(zoomMax, newZoom));
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}
