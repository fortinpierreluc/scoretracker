"use client";

import { useCallback, useMemo, useState } from "react";
import { GameCard } from "@/components/GameCard";
import { Modal } from "@/components/Modal";
import { RangeFilters } from "@/components/RangeFilters";
import { RefreshFooter } from "@/components/RefreshFooter";
import { TeamsView } from "@/components/TeamsView";
import { headingForDate } from "@/lib/dates";
import { useDisabledTeams } from "@/lib/disabled-teams";
import { useLiveData } from "@/lib/use-live-data";
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

function isVisibleOnPerso(game: GameDto, isDisabled: (id: number) => boolean) {
  const homeOn = game.home.isFollowed && !isDisabled(game.home.id);
  const awayOn = game.away.isFollowed && !isDisabled(game.away.id);
  return homeOn || awayOn;
}

export function PersoView() {
  const [range, setRange] = useState<GameRange>("today");
  const [teamsOpen, setTeamsOpen] = useState(false);
  const closeTeams = useCallback(() => setTeamsOpen(false), []);
  const { isDisabled } = useDisabledTeams();
  const { data, loading, error, refreshing, updatedAt, refresh } = useLiveData(async () => {
    const res = await fetch(`/api/games?range=${range}`, { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error ?? "Impossible de charger les matchs");
    return (payload.games ?? []) as GameDto[];
  }, [range]);

  const games = useMemo(() => data ?? [], [data]);
  const visibleGames = useMemo(
    () => games.filter((game) => isVisibleOnPerso(game, isDisabled)),
    [games, isDisabled],
  );
  const grouped = useMemo(() => groupByDate(visibleGames), [visibleGames]);

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <RangeFilters ranges={ranges} value={range} onChange={setRange} />
        </div>
        <button
          type="button"
          onClick={() => setTeamsOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[13px] text-slate-200 transition hover:bg-white/10 sm:px-4 sm:text-sm"
          title="Choisir les équipes suivies"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            <path
              d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4.5v5M8 14.5v5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span className="hidden sm:inline">Mes équipes</span>
          <span className="sm:hidden">Équipes</span>
        </button>
      </div>

      <Modal open={teamsOpen} title="Mes équipes" onClose={closeTeams}>
        <p className="mb-4 text-sm text-slate-400">
          Touche l&apos;œil pour afficher ou masquer l&apos;horaire d&apos;une équipe dans l&apos;onglet Perso.
        </p>
        <TeamsView />
      </Modal>

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

      {!loading ? (
        <RefreshFooter onRefresh={refresh} refreshing={refreshing} updatedAt={updatedAt} />
      ) : null}
    </section>
  );
}
