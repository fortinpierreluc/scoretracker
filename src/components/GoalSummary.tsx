"use client";

import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TeamLogo } from "@/components/TeamLogo";
import type { GameSource, GoalEventDto } from "@/lib/types";

// "siren" affiche Sirène.png. Remettre "puck" pour revenir à la rondelle.
const goalButtonIcon = "siren" as "siren" | "puck";

function PuckIcon() {
  return (
    <svg viewBox="0 0 24 16" aria-hidden="true" className="h-3.5 w-5">
      <ellipse cx="12" cy="5.2" rx="9" ry="3.1" fill="currentColor" />
      <path
        d="M3 5.4v5c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2v-5c0 1.7-4 3-9 3s-9-1.3-9-3z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}

function runningScores(goals: GoalEventDto[]) {
  let away = 0;
  let home = 0;
  return goals.map((goal) => {
    if (goal.side === "home") home += 1;
    else away += 1;
    return `${away}-${home}`;
  });
}

function GoalRow({ goal, score, showDivider }: { goal: GoalEventDto; score: string; showDivider: boolean }) {
  const assists = [goal.assists[0] ?? "—", goal.assists[1] ?? "—"];
  const assistLine = goal.assists.filter(Boolean).join(" · ");
  return (
    <li
      className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-2.5 sm:grid-cols-[28px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_3.25rem_2.75rem_2.75rem] ${showDivider ? "border-b border-white/6" : ""}`}
    >
      <TeamLogo src={goal.logoUrl} alt={goal.teamName || "Équipe"} size={28} className="row-start-1" />
      <p title={goal.scorer} className="col-start-2 row-start-1 min-w-0 truncate font-medium text-white">
        {goal.scorer}
      </p>
      {assistLine ? (
        <p title={assistLine} className="col-start-2 row-start-2 min-w-0 truncate text-slate-400 sm:hidden">
          {assistLine}
        </p>
      ) : null}
      <p title={assists[0]} className="hidden min-w-0 truncate text-slate-400 sm:col-start-3 sm:row-start-1 sm:block">
        <span className={assists[0] === "—" ? "text-slate-600" : ""}>{assists[0]}</span>
      </p>
      <p title={assists[1]} className="hidden min-w-0 truncate text-slate-400 sm:col-start-4 sm:row-start-1 sm:block">
        <span className={assists[1] === "—" ? "text-slate-600" : ""}>{assists[1]}</span>
      </p>
      <p className="col-start-3 row-start-1 text-right font-medium tabular-nums text-slate-200 sm:col-start-5">
        {goal.time}
      </p>
      <p className="col-start-3 row-start-2 text-right text-[11px] tracking-wide text-slate-500 sm:col-start-6 sm:row-start-1 sm:text-xs">
        {goal.period}
        <span className="ml-2 font-semibold tabular-nums text-white sm:hidden">{score}</span>
      </p>
      <p className="hidden text-right font-semibold tabular-nums text-white sm:col-start-7 sm:row-start-1 sm:block">
        {score}
      </p>
    </li>
  );
}

export function GoalSummaryButton({
  gameId,
  source,
  awayName,
  homeName,
}: {
  gameId: number;
  source: GameSource;
  awayName: string;
  homeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [goals, setGoals] = useState<GoalEventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/goals?source=${source}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger le sommaire");
        if (!cancelled) {
          setGoals(data.goals ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Impossible de charger le sommaire");
      }
    };

    load();
    const timer = window.setInterval(load, 15000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, gameId, source]);

  const dialog =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label="Fermer le sommaire"
              className="absolute inset-0 bg-black/70"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="goal-summary-title"
              className="relative z-10 flex max-h-[min(32rem,85vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12171f] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/8 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h2
                    id="goal-summary-title"
                    className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-[0.08em] text-white"
                  >
                    Sommaire des buts
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {awayName} — {homeName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/8 hover:text-white"
                  aria-label="Fermer"
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    ×
                  </span>
                </button>
              </div>

              <div className="overflow-y-auto px-4 py-2 sm:px-5">
                <div className="hidden grid-cols-[28px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_3.25rem_2.75rem_2.75rem] gap-x-3 border-b border-white/8 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:grid">
                  <span />
                  <span>Buteur</span>
                  <span>Passeur</span>
                  <span>Passeur</span>
                  <span className="text-right">Temps</span>
                  <span className="text-right">Période</span>
                  <span className="text-right">Score</span>
                </div>

                {error ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Le sommaire des buts est indisponible pour le moment.
                  </p>
                ) : goals === null ? (
                  <div className="space-y-2 py-3">
                    <div className="h-10 animate-pulse rounded-lg bg-white/5" />
                    <div className="h-10 animate-pulse rounded-lg bg-white/5" />
                  </div>
                ) : goals.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">Aucun but pour le moment.</p>
                ) : (
                  <ol>
                    {runningScores(goals).map((score, index) => {
                      const goal = goals[index];
                      const previous = goals[index - 1];
                      const newPeriod = index > 0 && previous.period !== goal.period;
                      return (
                        <Fragment key={`${goal.period}-${goal.time}-${goal.scorer}-${index}`}>
                          {newPeriod ? (
                            <li className="list-none py-2" aria-hidden="true">
                              <div className="h-px bg-white/15" />
                            </li>
                          ) : null}
                          <GoalRow
                            goal={goal}
                            score={score}
                            showDivider={index < goals.length - 1 && goals[index + 1]?.period === goal.period}
                          />
                        </Fragment>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setGoals(null);
          setError(null);
          setOpen(true);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/8 hover:text-slate-200"
        aria-label="Sommaire des buts"
      >
        {goalButtonIcon === "puck" ? (
          <PuckIcon />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/sirene.png" alt="" className="h-6 w-6 object-contain" />
        )}
      </button>
      {dialog}
    </>
  );
}
