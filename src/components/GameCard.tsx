import type { GameDto } from "@/lib/types";
import { TeamLogo } from "@/components/TeamLogo";

function formatGameDay(iso: string) {
  const date = new Date(iso);
  const formatted = new Intl.DateTimeFormat("fr-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Toronto",
  }).format(date);
  return formatted.replace(".", "").toUpperCase();
}

function formatGameTime(iso: string) {
  return new Intl.DateTimeFormat("fr-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Toronto",
  })
    .format(new Date(iso))
    .replace(":", " h ");
}

function TeamBlock({
  name,
  category,
  logoUrl,
  align,
  followed,
}: {
  name: string;
  category: string;
  logoUrl: string | null;
  align: "left" | "right";
  followed: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <TeamLogo src={logoUrl} alt={name} size={52} />
      <div className="min-w-0">
        <p
          className={`truncate font-[family-name:var(--font-oswald)] text-[15px] font-semibold uppercase tracking-[0.08em] ${
            followed ? "text-white" : "text-slate-200"
          }`}
        >
          {name}
        </p>
        <p className="truncate text-[11px] text-slate-400">{category}</p>
      </div>
    </div>
  );
}

function formatArenaLine(arena: string, city: string) {
  const cleaned = arena.replace(/\s*\((?:glace|ice|patinoire)[^)]*\)/gi, "").trim();
  return city ? `${cleaned} — ${city}` : cleaned;
}

export function GameCard({ game }: { game: GameDto }) {
  const liveMeta = [game.clock, game.periodLabel].filter(Boolean).join(" · ");

  return (
    <article className="overflow-hidden rounded-2xl border border-white/8 bg-[#12171f]/90 shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 border-b border-white/6 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">
        <p className="flex min-w-0 items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400/80" />
          <span className="truncate">{formatArenaLine(game.arena, game.city)}</span>
        </p>
        <p className="shrink-0 text-right text-[10px] text-slate-500">
          Saison régulière
          {game.number ? ` · ${game.number}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 sm:gap-6 sm:px-6">
        <TeamBlock
          name={game.away.shortName}
          category={game.category}
          logoUrl={game.away.logoUrl}
          align="left"
          followed={game.away.isFollowed}
        />

        <div className="flex min-w-[110px] flex-col items-center justify-center text-center">
          {game.status === "upcoming" ? (
            <>
              <p className="font-[family-name:var(--font-oswald)] text-[12px] font-medium uppercase tracking-[0.18em] text-slate-400">
                {formatGameDay(game.startTime)}
              </p>
              <p className="font-[family-name:var(--font-oswald)] text-[28px] font-semibold leading-none tracking-wide text-white">
                {formatGameTime(game.startTime)}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 font-[family-name:var(--font-oswald)] text-[32px] font-semibold leading-none tracking-wide">
                <span className={game.away.isFollowed ? "text-white" : "text-slate-200"}>
                  {game.awayScore ?? "–"}
                </span>
                <span className="text-lg text-slate-600">–</span>
                <span className={game.home.isFollowed ? "text-white" : "text-slate-200"}>
                  {game.homeScore ?? "–"}
                </span>
              </div>
              {game.status === "live" ? (
                <>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-400">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                    En cours
                  </p>
                  {liveMeta ? (
                    <p className="mt-0.5 text-[11px] font-medium tabular-nums tracking-wide text-slate-300">
                      {liveMeta}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Final
                </p>
              )}
            </>
          )}
        </div>

        <TeamBlock
          name={game.home.shortName}
          category={game.category}
          logoUrl={game.home.logoUrl}
          align="right"
          followed={game.home.isFollowed}
        />
      </div>
    </article>
  );
}
