"use client";

import { useEffect, useState } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import type { StandingsDto } from "@/lib/types";

type Option = { scheduleId: number; scheduleName: string; category: string };

function formatDiff(diff: number) {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

export function StandingsView() {
  const [options, setOptions] = useState<Option[]>([]);
  const [scheduleId, setScheduleId] = useState<number | "">("");
  const [standings, setStandings] = useState<StandingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = scheduleId ? `?scheduleId=${scheduleId}` : "";
        const res = await fetch(`/api/standings${query}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger le classement");
        if (cancelled) return;
        setOptions(data.options ?? []);
        setStandings(data.standings ?? null);
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
  }, [scheduleId]);

  return (
    <section className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
          Catégorie
        </span>
        <select
          value={scheduleId}
          onChange={(event) =>
            setScheduleId(event.target.value ? Number(event.target.value) : "")
          }
          className="w-full rounded-xl border border-white/10 bg-[#12171f] px-4 py-3 text-sm text-white outline-none ring-sky-400/40 focus:ring-2"
        >
          <option value="">Choisir une catégorie</option>
          {options.map((option) => (
            <option key={option.scheduleId} value={option.scheduleId}>
              {option.category}
            </option>
          ))}
        </select>
      </label>

      {loading && scheduleId ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      ) : error ? (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-6 text-sm text-rose-200">
          {error}
        </p>
      ) : !scheduleId ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-[family-name:var(--font-oswald)] text-xl uppercase tracking-[0.16em] text-slate-300">
            Choisir une catégorie
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Sélectionne une ligue pour afficher le classement.
          </p>
        </div>
      ) : !standings ? (
        <p className="text-sm text-slate-500">Aucun classement disponible.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#12171f]/90">
          <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_repeat(5,2.35rem)_3.1rem_2.6rem_repeat(2,2.35rem)] gap-2 border-b border-white/6 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:grid">
            <span>#</span>
            <span>Équipe</span>
            <span className="text-center">MJ</span>
            <span className="text-center">V</span>
            <span className="text-center">D</span>
            <span className="text-center">DP</span>
            <span className="text-center text-[11px] font-semibold tracking-[0.18em] text-slate-300">
              PTS
            </span>
            <span className="text-center">+/-</span>
            <span className="text-center">BP</span>
            <span className="text-center">BC</span>
          </div>
          {standings.rows.map((row) => (
            <div
              key={row.teamId}
              className={`grid grid-cols-[2.5rem_minmax(0,1fr)_3rem_2.7rem] items-center gap-2 border-b border-white/5 px-4 py-2.5 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_repeat(5,2.35rem)_3.1rem_2.6rem_repeat(2,2.35rem)] ${
                row.isFollowed ? "bg-sky-400/8" : ""
              }`}
            >
              <span className="text-sm text-slate-500">{row.ranking}</span>
              <div className="flex min-w-0 items-center gap-2.5">
                <TeamLogo src={row.logoUrl} alt={row.shortName} size={28} />
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-medium ${
                      row.isFollowed ? "text-white" : "text-slate-200"
                    }`}
                  >
                    {row.shortName}
                  </p>
                  <p className="text-[11px] text-slate-500 sm:hidden">
                    {row.gamesPlayed} MJ · {row.wins}-{row.losses}-{row.otl}
                  </p>
                </div>
              </div>
              <span className="hidden text-center text-sm text-slate-300 sm:block">
                {row.gamesPlayed}
              </span>
              <span className="hidden text-center text-sm text-slate-300 sm:block">{row.wins}</span>
              <span className="hidden text-center text-sm text-slate-300 sm:block">
                {row.losses}
              </span>
              <span className="hidden text-center text-sm text-slate-300 sm:block">{row.otl}</span>
              <span className="text-center font-[family-name:var(--font-oswald)] text-[22px] font-semibold leading-none tracking-wide text-white">
                {row.points}
              </span>
              <span
                className={`text-center text-sm ${
                  row.diff > 0 ? "text-emerald-400" : row.diff < 0 ? "text-rose-400" : "text-slate-400"
                }`}
              >
                {formatDiff(row.diff)}
              </span>
              <span className="hidden text-center text-sm text-slate-300 sm:block">
                {row.goalFor}
              </span>
              <span className="hidden text-center text-sm text-slate-300 sm:block">
                {row.goalAgainst}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
