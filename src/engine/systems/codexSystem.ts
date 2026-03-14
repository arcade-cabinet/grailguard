/**
 * @module codexSystem
 *
 * Pure function for codex discovery scanning. Uses Set for O(1) lookup
 * instead of Array.includes.
 */

/**
 * Scans a list of visible codex IDs against already-discovered ones and
 * returns only the newly discovered entries. Uses a Set internally for
 * O(1) membership testing.
 *
 * @param discoveredIds - Array of previously discovered codex IDs.
 * @param visibleIds - Array of currently visible codex IDs.
 * @returns Array of newly discovered IDs (deduplicated).
 */
export function discoverNewCodexEntries(discoveredIds: string[], visibleIds: string[]): string[] {
  const discoveredSet = new Set(discoveredIds);
  const newEntries: string[] = [];
  const seen = new Set<string>();

  for (const id of visibleIds) {
    if (!discoveredSet.has(id) && !seen.has(id)) {
      newEntries.push(id);
      seen.add(id);
    }
  }

  return newEntries;
}
