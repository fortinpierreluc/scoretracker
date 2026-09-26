"use client";

import { useEffect, useMemo, useState } from "react";
import { GameCard } from "@/components/GameCard";
import { RangeFilters } from "@/components/RangeFilters";
import { TeamLogo } from "@/components/TeamLogo";
import { headingForDate } from "@/lib/dates";
import type { AslTeamRowDto, GameDto, GameRange, LastFiveResult } from "@/lib/types";

const ranges: Array<{ id: GameRange; label: string }> = [
  { id: "past7", label: "7 derniers jours" },
  { id: "today", label: "Aujourd'hui" },
  { id: "next7", label: "7 prochains jours" },
];

const subtabs = [
  { id: "horaire", label: "Horaire" },
  { id: "equipes", label: "Équipes" },
] as const;

type Subtab = (typeof subtabs)[number]["id"];

function groupByDate(games: GameDto[]) {
  const groups = new Map<string, GameDto[]>();
  for (const game of games) {
    const list = groups.get(game.date) ?? [];
    list.push(game);
    groups.set(game.date, list);
  }
  return [...groups.entries()];
}

function resultClass(result: LastFiveResult) {
  if (result === "V") return "bg-emerald-500/15 text-emerald-300";
  if (result === "D") return "bg-rose-500/15 text-rose-300";
  if (result === "DP") return "bg-amber-500/15 text-amber-300";
  return "bg-white/8 text-slate-300";
}

function LastFive({ results }: { results: LastFiveResult[] }) {
  if (!results.length) {
    return <span className="text-xs text-slate-600">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5" title="5 derniers matchs">
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-semibold ${resultClass(result)}`}
        >
          {result}
        </span>
      ))}
    </span>
  );
}

function AslSchedule() {
  const [range, setRange] = useState<GameRange>("today");
  const [games, setGames] = useState<GameDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let first = true;
    const load = async () => {
      if (first) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/asl/games?range=${range}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger l'horaire ASL");
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

  const grouped = useMemo(() => groupByDate(games), [games]);

  return (
    <div className="space-y-6">
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
      ) : games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-[family-name:var(--font-oswald)] text-xl uppercase tracking-[0.16em] text-slate-300">
            Aucun match
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {range === "today"
              ? "Pas de match de saison régulière aujourd'hui pour l'Académie Saint-Louis."
              : "Aucun match de saison régulière de l'ASL dans cette période."}
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
    </div>
  );
}

function formatRank(ranking: number | null, teamCount: number | null) {
  if (!ranking) return "—";
  const ordinal = ranking === 1 ? "1er" : `${ranking}e`;
  return teamCount ? `${ordinal}/${teamCount}` : ordinal;
}

function AslTeams() {
  const [teams, setTeams] = useState<AslTeamRowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/asl/teams", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger les équipes ASL");
        if (!cancelled) setTeams(data.teams ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-10 animate-pulse rounded-xl bg-white/5" />
        <div className="h-10 animate-pulse rounded-xl bg-white/5" />
        <div className="h-10 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-6 text-sm text-rose-200">
        {error}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/8 bg-[#12171f]/90">
      <div className="min-w-[40rem]">
        <div className="grid grid-cols-[minmax(9rem,1.25fr)_minmax(8rem,1.1fr)_4.4rem_4.1rem_7.4rem] gap-3 border-b border-white/6 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
          <span>Équipe</span>
          <span>Entraîneur-chef</span>
          <span>Fiche</span>
          <span>Rang</span>
          <span className="text-right">5 derniers</span>
        </div>
        <ul>
          {teams.map((team) => (
            <li
              key={team.id}
              className="grid grid-cols-[minmax(9rem,1.25fr)_minmax(8rem,1.1fr)_4.4rem_4.1rem_7.4rem] items-center gap-3 border-b border-white/6 px-3 py-2 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <TeamLogo src={team.logoUrl} alt={team.shortName} size={28} />
                <p className="truncate font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-[0.06em] text-white">
                  {team.shortName}
                </p>
              </div>
              <p className="truncate text-sm text-slate-300">{team.coach ?? "—"}</p>
              <p className="font-mono text-sm tabular-nums text-slate-200">{team.record}</p>
              <p className="text-sm tabular-nums text-sky-300/90">
                {formatRank(team.ranking, team.teamCount)}
              </p>
              <div className="justify-self-end">
                <LastFive results={team.lastFive} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AslView() {
  const [subtab, setSubtab] = useState<Subtab>("horaire");

  return (
    <section className="space-y-6">
      <div className="flex gap-1 rounded-full border border-white/8 bg-white/4 p-1">
        {subtabs.map((item) => {
          const active = item.id === subtab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubtab(item.id)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                active ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {subtab === "horaire" ? <AslSchedule /> : <AslTeams />}
    </section>
  );
}
