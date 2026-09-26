"use client";

import { useEffect, useMemo, useState } from "react";
import { GameCard } from "@/components/GameCard";
import { RangeFilters } from "@/components/RangeFilters";
import { headingForDate } from "@/lib/dates";
import { useDisabledTeams } from "@/lib/disabled-teams";
import type { GameDto, GameRange } from "@/lib/types";

const ranges: Array<{ id: GameRange; label: string }> = [
  { id: "past7", label: "7 derniers jours" },
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

function isVisibleOnMatches(game: GameDto, isDisabled: (id: number) => boolean) {
  const homeOn = game.home.isFollowed && !isDisabled(game.home.id);
  const awayOn = game.away.isFollowed && !isDisabled(game.away.id);
  return homeOn || awayOn;
}

export function MatchesView() {
  const [range, setRange] = useState<GameRange>("today");
  const [games, setGames] = useState<GameDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDisabled } = useDisabledTeams();

  useEffect(() => {
    let cancelled = false;
    let first = true;
    const load = async () => {
      if (first) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/games?range=${range}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger les matchs");
        if (!cancelled) setGames(data.games ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        first = false;
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, 45000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [range]);

  const visibleGames = useMemo(
    () => games.filter((game) => isVisibleOnMatches(game, isDisabled)),
    [games, isDisabled],
  );
  const grouped = useMemo(() => groupByDate(visibleGames), [visibleGames]);

  return (
    <section className="space-y-6">
      <RangeFilters ranges={ranges} value={range} onChange={setRange} />

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-6 text-sm text-rose-200">
          {error}
        </p>
      ) : visibleGames.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-[family-name:var(--font-oswald)] text-xl uppercase tracking-[0.16em] text-slate-300">
            Aucun match
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {range === "today"
              ? "Pas de match de saison régulière aujourd'hui pour les équipes suivies."
              : "Aucun match de saison régulière dans cette période."}
          </p>
        </div>
      ) : (
        grouped.map(([date, dayGames]) => (
          <div key={date} className="space-y-3">
            <h2 className="px-1 font-[family-name:var(--font-oswald)] text-sm uppercase tracking-[0.22em] text-slate-400">
              {headingForDate(date)}
            </h2>
            {dayGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}
