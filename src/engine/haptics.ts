/**
 * @module haptics
 *
 * Thin wrapper around expo-haptics that respects a runtime enabled flag
 * and no-ops on web. All functions are fire-and-forget (void return);
 * failures are silently swallowed so haptics never crash the app.
 */
import { Platform } from 'react-native';

let hapticsModule: typeof import('expo-haptics') | null = null;

// Lazy-load expo-haptics only on native platforms
if (Platform.OS !== 'web') {
  import('expo-haptics')
    .then((mod) => {
      hapticsModule = mod;
    })
    .catch(() => {
      // expo-haptics not available (e.g. bare workflow without native module)
    });
}

/**
 * Triggers a light impact haptic. Use for subtle UI taps and selections.
 *
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function impactLight(enabled = true): void {
  if (!enabled || !hapticsModule) return;
  void hapticsModule.impactAsync(hapticsModule.ImpactFeedbackStyle.Light);
}

/**
 * Triggers a medium impact haptic. Use for building placement, upgrades.
 *
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function impactMedium(enabled = true): void {
  if (!enabled || !hapticsModule) return;
  void hapticsModule.impactAsync(hapticsModule.ImpactFeedbackStyle.Medium);
}

/**
 * Triggers a heavy impact haptic. Use for explosions, boss spawns, spell casts.
 *
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function impactHeavy(enabled = true): void {
  if (!enabled || !hapticsModule) return;
  void hapticsModule.impactAsync(hapticsModule.ImpactFeedbackStyle.Heavy);
}

/**
 * Triggers a success notification haptic. Use for wave completion, victory.
 *
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function notificationSuccess(enabled = true): void {
  if (!enabled || !hapticsModule) return;
  void hapticsModule.notificationAsync(hapticsModule.NotificationFeedbackType.Success);
}

/**
 * Triggers a warning notification haptic. Use for low health, boss approach.
 *
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function notificationWarning(enabled = true): void {
  if (!enabled || !hapticsModule) return;
  void hapticsModule.notificationAsync(hapticsModule.NotificationFeedbackType.Warning);
}
