# AI Agent Instructions for Grailguard

When contributing to this repository, you MUST adhere to the following rules to ensure cross-platform compatibility and maximum performance in the React Native / Expo WebGL environment.

## 1. Zero DOM Manipulation
This is a React Native app. You cannot use web-specific DOM APIs.
- NEVER use `document.createElement`, `document.getElementById`, or `window.addEventListener`.
- NEVER append `<div>` elements for HUDs, floating text, or health bars.
- NEVER use HTML Drag and Drop APIs. Use React Native's `PanResponder` or `@react-three/fiber` raycasting for 3D interactions.

## 2. React Native Reusables (UI)
All 2D User Interface elements (the Toychest, the Top Bezel, Main Menu) must be built using React Native `View`, `Text`, and `TouchableOpacity`. Use Tailwind classes (via NativeWind) for styling.

## 3. High-Performance WebGL (React Three Fiber)
- **Do not use `useState` for rapid updates.** If a property changes every frame (like position, rotation, or scale), it must be mutated imperatively inside a `useFrame` hook using a `useRef` to the mesh.
- **Use InstancedMesh for repetition.** The MapGrid, Scenery, and any high-volume particle effects must use `THREE.InstancedMesh`.
- **Preload Assets.** Use `useGLTF.preload()` for all 3D models before rendering to prevent stuttering.

## 4. Architecture Enforcement
Do not bundle game logic into React components.
- The simulation logic and combat mathematics belong in `/src/engine`.
- Durable state and meta-progression belong in `/src/db` through Expo SQLite + Drizzle repositories.
- Live run state belongs in the Koota ECS world, not in Zustand or ad hoc React state.
- 3D Visuals belong in `/src/components/3d`.
- 2D Overlays belong in `/src/components/ui`.

Follow these rules rigidly. The overarching goal is a locked 60 FPS on iOS, Android, and Web without causing memory leaks or bridge congestion.
