"use client";

import { useEffect, useMemo, useState } from "react";
import { formatRank, LastFive } from "@/components/AslView";
import { GameCard } from "@/components/GameCard";
import { RangeFilters } from "@/components/RangeFilters";
import { RefreshFooter } from "@/components/RefreshFooter";
import { TeamLogo } from "@/components/TeamLogo";
import {
  DEFAULT_SLQNE_GROUPS,
  isSlqneGroupId,
  programsForGroups,
  slqneGroups,
} from "@/data/slqne";
import type { SlqneGroupId } from "@/data/slqne";
import { headingForDate } from "@/lib/dates";
import { useLiveData } from "@/lib/use-live-data";
import type { GameDto, GameRange, SlqneTeamRowDto } from "@/lib/types";

const STORAGE_KEY = "tracking-equipes:slqne-groups";

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

function readStoredGroups(): SlqneGroupId[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SLQNE_GROUPS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_SLQNE_GROUPS;
    return parsed.filter((value): value is SlqneGroupId => typeof value === "string" && isSlqneGroupId(value));
  } catch {
    return DEFAULT_SLQNE_GROUPS;
  }
}

function storeGroups(groups: SlqneGroupId[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // Préférence de confort seulement.
  }
}

function groupByDate(games: GameDto[]) {
  const groups = new Map<string, GameDto[]>();
  for (const game of games) {
    const list = groups.get(game.date) ?? [];
    list.push(game);
    groups.set(game.date, list);
  }
  return [...groups.entries()];
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
      <p className="font-[family-name:var(--font-oswald)] text-xl uppercase tracking-[0.16em] text-slate-300">
        {title}
      </p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function GroupToggles({
  value,
  onToggle,
}: {
  value: SlqneGroupId[];
  onToggle: (id: SlqneGroupId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Programmes affichés">
      {slqneGroups.map((group) => {
        const checked = value.includes(group.id);
        return (
          <button
            key={group.id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onToggle(group.id)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              checked
                ? "border-sky-400/50 bg-sky-400/15 text-white"
                : "border-white/10 bg-white/4 text-slate-400 hover:text-white"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                checked ? "border-sky-300 bg-sky-400 text-slate-950" : "border-slate-500"
              }`}
              aria-hidden="true"
            >
              {checked ? (
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                  <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : null}
            </span>
            {group.label}
          </button>
        );
      })}
    </div>
  );
}

function SlqneSchedule({ groups }: { groups: SlqneGroupId[] }) {
  const [range, setRange] = useState<GameRange>("today");
  const key = groups.join(",");
  const { data, loading, error, refreshing, updatedAt, refresh } = useLiveData(async () => {
    const res = await fetch(`/api/slqne/games?range=${range}&groups=${key}`, { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error ?? "Impossible de charger l'horaire SLQNE");
    return (payload.games ?? []) as GameDto[];
  }, [range, key]);

  const games = useMemo(() => data ?? [], [data]);
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
        <EmptyState
          title="Aucun match"
          detail={
            range === "today"
              ? "Pas de match de saison régulière aujourd'hui pour les programmes cochés."
              : "Aucun match de saison régulière dans cette période pour les programmes cochés."
          }
        />
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
    </div>
  );
}

function groupByProgram(teams: SlqneTeamRowDto[]) {
  const programs = new Map<string, { label: string; teams: SlqneTeamRowDto[] }>();
  for (const team of teams) {
    const entry = programs.get(team.programId) ?? { label: team.programLabel, teams: [] };
    entry.teams.push(team);
    programs.set(team.programId, entry);
  }
  return [...programs.entries()];
}

const gridColumns =
  "grid-cols-[minmax(9rem,1.25fr)_minmax(8rem,1.1fr)_4.4rem_4.1rem_7.4rem]";

function SlqneTeams({ groups }: { groups: SlqneGroupId[] }) {
  const key = groups.join(",");
  const { data, loading, error, refreshing, updatedAt, refresh } = useLiveData(async () => {
    const res = await fetch(`/api/slqne/teams?groups=${key}`, { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error ?? "Impossible de charger les équipes SLQNE");
    return (payload.teams ?? []) as SlqneTeamRowDto[];
  }, [key]);

  const programs = useMemo(() => groupByProgram(data ?? []), [data]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-10 animate-pulse rounded-xl bg-white/5" />
        <div className="h-10 animate-pulse rounded-xl bg-white/5" />
        <div className="h-10 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-6 text-sm text-rose-200">
          {error}
        </p>
      ) : programs.length === 0 ? (
        <EmptyState title="Aucune équipe" detail="Aucune équipe trouvée pour les programmes cochés." />
      ) : (
        programs.map(([programId, program]) => (
          <div key={programId} className="space-y-2">
            <h2 className="px-1 font-[family-name:var(--font-oswald)] text-sm uppercase tracking-[0.22em] text-slate-400">
              {program.label}
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-white/8 bg-[#12171f]/90">
              <div className="min-w-[40rem]">
                <div
                  className={`grid ${gridColumns} gap-3 border-b border-white/6 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500`}
                >
                  <span>Équipe</span>
                  <span>Entraîneur-chef</span>
                  <span>Fiche</span>
                  <span>Rang</span>
                  <span className="text-right">5 derniers</span>
                </div>
                <ul>
                  {program.teams.map((team) => (
                    <li
                      key={team.id}
                      className={`grid ${gridColumns} items-center gap-3 border-b border-white/6 px-3 py-2 last:border-b-0`}
                    >
                      <a
                        href={team.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-center gap-2.5"
                        title={team.name}
                      >
                        <TeamLogo src={team.logoUrl} alt={team.shortName} size={28} />
                        <span className="truncate font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-[0.06em] text-white">
                          {team.shortName}
                        </span>
                      </a>
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
          </div>
        ))
      )}
      <RefreshFooter onRefresh={refresh} refreshing={refreshing} updatedAt={updatedAt} />
    </div>
  );
}

export function SlqneView() {
  const [subtab, setSubtab] = useState<Subtab>("horaire");
  const [groups, setGroups] = useState<SlqneGroupId[]>(DEFAULT_SLQNE_GROUPS);

  useEffect(() => {
    setGroups(readStoredGroups());
  }, []);

  const toggleGroup = (id: SlqneGroupId) => {
    setGroups((current) => {
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : slqneGroups.map((group) => group.id).filter((value) => value === id || current.includes(value));
      storeGroups(next);
      return next;
    });
  };

  const hasPrograms = programsForGroups(groups).length > 0;

  return (
    <section className="space-y-6">
      <GroupToggles value={groups} onToggle={toggleGroup} />

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

      {groups.length === 0 ? (
        <EmptyState title="Aucun programme" detail="Coche AAA, Scolaire ou HQNE pour afficher des équipes." />
      ) : !hasPrograms ? (
        <EmptyState
          title="À venir"
          detail="Aucune équipe n'est encore configurée pour ce programme."
        />
      ) : subtab === "horaire" ? (
        <SlqneSchedule groups={groups} />
      ) : (
        <SlqneTeams groups={groups} />
      )}
    </section>
  );
}
