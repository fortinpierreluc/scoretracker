"use client";

import { useEffect, useState } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import { useDisabledTeams } from "@/lib/disabled-teams";
import type { FollowedTeamDto } from "@/lib/types";

function VisibilityIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M10.5 6.2A10.8 10.8 0 0 1 12 6c5.2 0 8.8 4.2 9.8 5.6a1.3 1.3 0 0 1 0 1.5c-.4.5-1.2 1.6-2.5 2.7M6.2 8.4C4.6 9.6 3.6 11 3.2 11.6a1.3 1.3 0 0 0 0 1.5C4.2 14.5 7.8 18 12 18c1.2 0 2.3-.3 3.3-.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9.2 9.4A3.5 3.5 0 0 0 12 15.5c.4 0 .8-.1 1.1-.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3.2 11.6C4.2 10.2 7.8 6 12 6s7.8 4.2 8.8 5.6a1.3 1.3 0 0 1 0 1.5C19.8 14.5 16.2 18 12 18s-7.8-3.5-8.8-4.9a1.3 1.3 0 0 1 0-1.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function TeamsView() {
  const [teams, setTeams] = useState<FollowedTeamDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDisabled, toggle } = useDisabledTeams();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/teams", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger les équipes");
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
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
    <section className="grid gap-3 sm:grid-cols-2">
      {teams.map((team) => {
        const disabled = isDisabled(team.id);
        return (
          <article
            key={team.id}
            className={`relative flex items-center gap-4 rounded-2xl border p-4 pr-14 transition ${
              disabled
                ? "border-white/6 bg-[#12171f]/55 opacity-55"
                : "border-white/8 bg-[#12171f]/90"
            }`}
          >
            <TeamLogo src={team.logoUrl} alt={team.shortName} size={64} />
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-[0.08em] text-white">
                {team.shortName}
              </p>
              <p className="truncate text-sm text-slate-300">{team.nickname}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-sky-300/80">
                {team.category}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Fiche {team.record}
                {team.ranking ? ` · ${team.ranking}e` : ""}
                {team.points !== null ? ` · ${team.points} pts` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle(team.id)}
              aria-pressed={disabled}
              title={
                disabled
                  ? `Réactiver l'horaire de ${team.shortName}`
                  : `Désactiver l'horaire de ${team.shortName}`
              }
              aria-label={
                disabled
                  ? `Réactiver l'horaire de ${team.shortName}`
                  : `Désactiver l'horaire de ${team.shortName}`
              }
              className={`absolute right-3 top-3 rounded-full p-2 transition ${
                disabled
                  ? "text-slate-500 hover:bg-white/8 hover:text-slate-200"
                  : "text-slate-400 hover:bg-white/8 hover:text-white"
              }`}
            >
              <VisibilityIcon hidden={disabled} />
            </button>
          </article>
        );
      })}
    </section>
  );
}
