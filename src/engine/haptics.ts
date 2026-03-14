/**
 * @module haptics
 *
 * Haptic feedback stubs for the web platform. On web, haptics are no-ops.
 * When running inside Capacitor on native, these could be wired up to
 * a Capacitor haptics plugin in the future.
 */

/**
 * Triggers a light impact haptic. No-op on web.
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function impactLight(_enabled = true): void {
  // No-op on web; Capacitor haptics plugin can be added later
}

/**
 * Triggers a medium impact haptic. No-op on web.
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function impactMedium(_enabled = true): void {
  // No-op on web
}

/**
 * Triggers a heavy impact haptic. No-op on web.
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function impactHeavy(_enabled = true): void {
  // No-op on web
}

/**
 * Triggers a success notification haptic. No-op on web.
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function notificationSuccess(_enabled = true): void {
  // No-op on web
}

/**
 * Triggers a warning notification haptic. No-op on web.
 * @param enabled - Whether haptics are enabled (from settings). Defaults to true.
 */
export function notificationWarning(_enabled = true): void {
  // No-op on web
}
