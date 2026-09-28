"use client";

import { useState } from "react";
import { ArenasView } from "@/components/ArenasView";
import { AslView } from "@/components/AslView";
import { MatchesView } from "@/components/MatchesView";
import { StandingsView } from "@/components/StandingsView";
import { TeamsView } from "@/components/TeamsView";

const tabs = [
  { id: "matchs", label: "Matchs" },
  { id: "arenas", label: "Arénas" },
  { id: "equipes", label: "Équipes" },
  { id: "classements", label: "Classements" },
  { id: "asl", label: "ASL" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AppShell() {
  const [tab, setTab] = useState<TabId>("matchs");

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-3">
        <h1 className="min-w-0 font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-white sm:text-3xl sm:tracking-[0.08em]">
          Hockey <span className="whitespace-nowrap">2026-2027</span>
          <span className="mx-2 font-normal text-slate-500 sm:mx-2.5">|</span>
          <span className="inline-block whitespace-nowrap text-slate-200">Suivi des équipes</span>
        </h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          className="h-11 w-auto shrink-0 sm:h-14"
        />
      </header>

      <nav className="mb-6 flex gap-1 rounded-full border border-white/8 bg-white/4 p-1">
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-full px-1.5 py-2.5 text-[11px] font-medium transition sm:px-3 sm:text-sm ${
                active ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === "matchs" ? <MatchesView /> : null}
      {tab === "arenas" ? <ArenasView /> : null}
      {tab === "equipes" ? <TeamsView /> : null}
      {tab === "asl" ? <AslView /> : null}
      {tab === "classements" ? <StandingsView /> : null}
    </div>
  );
}
