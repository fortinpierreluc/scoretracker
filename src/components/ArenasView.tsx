"use client";

import { useEffect, useMemo, useState } from "react";
import { GameCard } from "@/components/GameCard";
import { RangeFilters } from "@/components/RangeFilters";
import { followedArenas } from "@/data/followed-arenas";
import type { ArenaId } from "@/data/followed-arenas";
import { headingForDate } from "@/lib/dates";
import type { GameDto, GameRange } from "@/lib/types";

const ranges: Array<{ id: GameRange; label: string }> = [
  { id: "today", label: "Aujourd'hui" },
  { id: "next7", label: "7 prochains jours" },
];

function groupByDate(games: GameDto[]) {
  const groups = new Map<string, GameDto[]>();
  for (const game of games) {
    const list = groups.get(game.date) ?? [];
    list.push(game);
    groups.set(game.date, list);
  }
  return [...groups.entries()];
}

function arenaLabel(arena: (typeof followedArenas)[number]) {
  return "hint" in arena && arena.hint ? `${arena.label} (${arena.hint})` : arena.label;
}

export function ArenasView() {
  const [arenaId, setArenaId] = useState<ArenaId | "">("");
  const [range, setRange] = useState<GameRange>("today");
  const [games, setGames] = useState<GameDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = followedArenas.find((arena) => arena.id === arenaId);

  useEffect(() => {
    if (!arenaId) {
      setGames([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setGames([]);
    setLoading(true);
    setError(null);

    const load = async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const res = await fetch(`/api/games?range=${range}&arena=${arenaId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger les matchs");
        if (!cancelled) {
          setGames(data.games ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load(true);
    const timer = window.setInterval(() => load(false), 45000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [arenaId, range]);

  const grouped = useMemo(() => groupByDate(games), [games]);

  return (
    <section className="space-y-6">
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Aréna</span>
        <select
          value={arenaId}
          onChange={(event) => setArenaId((event.target.value || "") as ArenaId | "")}
          className="w-full rounded-xl border border-white/10 bg-[#12171f] px-4 py-3 text-sm text-white outline-none ring-sky-400/40 focus:ring-2"
        >
          <option value="">Choisir un aréna</option>
          {followedArenas.map((arena) => (
            <option key={arena.id} value={arena.id}>
              {arenaLabel(arena)}
            </option>
          ))}
        </select>
      </label>

      <RangeFilters ranges={ranges} value={range} onChange={setRange} />

      { !arenaId ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-[family-name:var(--font-oswald)] text-xl uppercase tracking-[0.16em] text-slate-300">
            Choisir un aréna
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Sélectionne un aréna pour voir les matchs de saison régulière.
          </p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-6 text-sm text-rose-200">
          {error}
        </p>
      ) : games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-[family-name:var(--font-oswald)] text-xl uppercase tracking-[0.16em] text-slate-300">
            Aucun match
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {range === "today"
              ? `Pas de match de saison régulière aujourd'hui à ${selected?.label}.`
              : `Aucun match de saison régulière à ${selected?.label} dans les 7 prochains jours.`}
          </p>
        </div>
      ) : (
        grouped.map(([date, dayGames]) => (
          <div key={date} className="space-y-3">
            <h2 className="px-1 font-[family-name:var(--font-oswald)] text-sm uppercase tracking-[0.22em] text-slate-400">
              {headingForDate(date)}
            </h2>
            {dayGames.map((game) => (
              <GameCard key={`${game.id}-${game.startTime}`} game={game} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}
