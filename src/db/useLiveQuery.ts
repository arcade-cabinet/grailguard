/**
 * @module useLiveQuery
 *
 * A lightweight replacement for `drizzle-orm/expo-sqlite`'s `useLiveQuery`.
 * Uses a simple event emitter + polling approach to re-render components
 * when database writes occur.
 *
 * Call `notifyDbChange()` after any write to trigger re-renders in all
 * active `useLiveQuery` consumers.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type Listener = () => void;

const listeners = new Set<Listener>();
let changeCounter = 0;

/**
 * Notify all active live queries that the database has been modified.
 * Call this after any DB write operation.
 */
export function notifyDbChange(): void {
  changeCounter++;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * React hook that executes a Drizzle query and re-runs it whenever
 * `notifyDbChange()` is called.
 *
 * @param queryFn - A function that returns a Drizzle query promise.
 * @returns An object with `data` (the query result array).
 */
export function useLiveQuery<T>(queryFn: { then: (fn: (v: T[]) => void) => unknown }): {
  data: T[];
} {
  const [data, setData] = useState<T[]>([]);
  const [version, setVersion] = useState(changeCounter);
  const queryRef = useRef(queryFn);
  queryRef.current = queryFn;

  const refresh = useCallback(() => {
    setVersion(changeCounter);
  }, []);

  useEffect(() => {
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(queryRef.current).then((result: unknown) => {
      if (!cancelled) {
        setData(Array.isArray(result) ? result : []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { data };
}
