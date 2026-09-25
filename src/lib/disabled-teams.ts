"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tracking-equipes:disabled-teams";
const CHANGE_EVENT = "tracking-equipes:disabled-teams";

function readDisabledTeamIds(): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is number => typeof value === "number");
  } catch {
    return [];
  }
}

function writeDisabledTeamIds(ids: number[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

let memoryIds: number[] | null = null;

function getMemoryIds() {
  if (memoryIds === null) {
    memoryIds = typeof window === "undefined" ? [] : readDisabledTeamIds();
  }
  return memoryIds;
}

export function useDisabledTeams() {
  const [ids, setIds] = useState<Set<number>>(() => new Set(getMemoryIds()));

  useEffect(() => {
    const refresh = () => {
      memoryIds = readDisabledTeamIds();
      setIds(new Set(memoryIds));
    };
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const isDisabled = useCallback((id: number) => ids.has(id), [ids]);

  const toggle = useCallback((id: number) => {
    const current = getMemoryIds();
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    memoryIds = next;
    writeDisabledTeamIds(next);
    setIds(new Set(next));
  }, []);

  return { disabledIds: ids, isDisabled, toggle };
}
