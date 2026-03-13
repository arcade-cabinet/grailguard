/**
 * @module i18n
 *
 * Minimal localization layer for Grailguard. Exports a `t()` function that
 * returns the English string for a given translation key. Supports simple
 * `{placeholder}` interpolation for dynamic values.
 *
 * To add a new locale, create a sibling JSON file (e.g. `fr.json`) and
 * swap the import below.
 */
import en from './en.json';

type TranslationKey = keyof typeof en;

/**
 * Returns the localized string for the given key.
 * Supports `{placeholder}` interpolation via the optional `vars` argument.
 *
 * @param key - A valid translation key from en.json.
 * @param vars - Optional record of placeholder values to interpolate.
 * @returns The translated string, or the key itself if not found.
 */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  let value: string = en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}

export type { TranslationKey };
