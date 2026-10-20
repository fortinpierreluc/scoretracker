"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export function useLiveData<T>(
  loader: () => Promise<T>,
  deps: DependencyList,
  options?: { enabled?: boolean; intervalMs?: number },
) {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? 45000;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const loaderRef = useRef(loader);
  const generation = useRef(0);
  loaderRef.current = loader;

  const run = useCallback(
    async (mode: "initial" | "silent") => {
      if (!enabled) return;
      const current = generation.current;
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      try {
        const next = await loaderRef.current();
        if (current !== generation.current) return;
        setData(next);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (err) {
        if (current !== generation.current) return;
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        if (current === generation.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    generation.current += 1;
    if (!enabled) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      setUpdatedAt(null);
      return;
    }

    void run("initial");
    const timer = window.setInterval(() => void run("silent"), intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void run("silent");
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      generation.current += 1;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // Loader identity is tracked via loaderRef; callers pass the values it reads in `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, run, ...deps]);

  return {
    data,
    loading,
    refreshing,
    error,
    updatedAt,
    refresh: () => {
      void run("silent");
    },
  };
}
