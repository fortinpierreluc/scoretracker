import { spordle } from "@/lib/spordle";
import type { GameSource, GoalEventDto } from "@/lib/types";

const HT_API = "https://lscluster.hockeytech.com/feed/index.php";
const HT_KEY = "f1aa699db3d81487";

type SpordleGoal = {
  teamId: number;
  participantId: number;
  assistIds?: number[];
  gameTime?: {
    period?: string | number;
    minutes?: number;
    seconds?: number;
    elapsedMinutes?: number;
    elapsedSeconds?: number;
  };
};

type SpordleSide = { name?: string; shortName?: string; logoUrl?: string | null };

type SpordleGoalGame = {
  seasonId?: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam?: SpordleSide;
  awayTeam?: SpordleSide;
  goals?: SpordleGoal[];
};

type SpordleMember = {
  teamId: number;
  participantId: number;
  participant?: { fullName?: string; firstName?: string; lastName?: string };
};

type HtGoal = {
  team?: { id?: number | string; nickname?: string; name?: string; logo?: string };
  period?: { longName?: string; shortName?: string; id?: string };
  time?: string;
  scoredBy?: { firstName?: string; lastName?: string };
  assists?: Array<{ firstName?: string; lastName?: string }>;
};

type HtSummary = {
  homeTeam?: { info?: { id?: number | string } };
  periods?: Array<{ goals?: HtGoal[] }>;
};

type LhsaaqStat = { statTypeId?: number; playerId?: number };
type LhsaaqEvent = {
  eventTypeId?: number;
  periodId?: number;
  teamId?: number;
  time?: string;
  statList?: LhsaaqStat[];
};
type LhsaaqPlayer = { id?: number; contactId?: number; firstName?: string; lastName?: string; name?: string };
type LhsaaqDetails = {
  localTeamId?: number;
  visitorTeamId?: number;
  localTeamName?: string;
  visitorTeamName?: string;
  localTeamAvatar?: string;
  visitorTeamAvatar?: string;
  eventList?: LhsaaqEvent[];
  teamList?: Array<{ players?: LhsaaqPlayer[] }>;
};

function personName(first?: string | null, last?: string | null, full?: string | null) {
  const raw = (full || [first, last].filter(Boolean).join(" "))
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  return raw
    .toLocaleLowerCase("fr-CA")
    .replace(/(?:^|[\s'-])\S/g, (chunk) => chunk.toLocaleUpperCase("fr-CA"));
}

function tidyPeriod(label: string) {
  return label.replace(/ère$/i, "re").replace(/i[eè]me$/i, "e");
}

function periodLabel(period: string | number | null | undefined) {
  const raw = String(period ?? "").trim();
  if (/^(ot|so|prol|fus)/i.test(raw)) return /fus/i.test(raw) ? "Fus." : "Prol.";
  const value = Number(raw);
  if (value === 1) return "1re";
  if (value === 2) return "2e";
  if (value === 3) return "3e";
  if (value === 4) return "Prol.";
  if (Number.isFinite(value) && value > 4) return "Fus.";
  return raw;
}

function clockFromParts(minutes?: number, seconds?: number) {
  return `${minutes ?? 0}:${String(seconds ?? 0).padStart(2, "0")}`;
}

function clockFromStamp(value: string | null | undefined) {
  if (!value) return "";
  const parts = value.split(":");
  if (parts.length >= 3) {
    const minutes = Number(parts[parts.length - 2]);
    const seconds = parts[parts.length - 1].padStart(2, "0");
    return `${Number.isFinite(minutes) ? minutes : 0}:${seconds}`;
  }
  return value;
}

function stampSeconds(value: string | null | undefined) {
  if (!value) return 0;
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function parseMaybeJsonp(text: string): HtSummary {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed) as HtSummary;
  const start = trimmed.indexOf("(");
  const end = trimmed.lastIndexOf(")");
  if (start < 0 || end <= start) throw new Error("Réponse LHJMQ illisible");
  return JSON.parse(trimmed.slice(start + 1, end)) as HtSummary;
}

function unescapeJsString(value: string) {
  return value.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, seq: string) => {
    if (seq.startsWith("u")) return String.fromCharCode(Number.parseInt(seq.slice(1), 16));
    if (seq.startsWith("x")) return String.fromCharCode(Number.parseInt(seq.slice(1), 16));
    if (seq === "n") return "\n";
    if (seq === "r") return "\r";
    if (seq === "t") return "\t";
    return seq;
  });
}

async function getSpordleGoals(gameId: number): Promise<GoalEventDto[]> {
  const game = await spordle<SpordleGoalGame>(
    `/sp/games/${gameId}`,
    { include: ["goals", "homeTeam", "awayTeam"] },
    { fresh: true },
  );
  const goals = game.goals ?? [];
  if (!goals.length) return [];

  const participantIds = [
    ...new Set(goals.flatMap((goal) => [goal.participantId, ...(goal.assistIds ?? [])]).filter(Boolean)),
  ];
  const members = await spordle<SpordleMember[]>(
    "/sp/members",
    {
      where: {
        and: [
          { participantId: { inq: participantIds } },
          { teamId: { inq: [game.homeTeamId, game.awayTeamId] } },
          ...(game.seasonId ? [{ seasonId: game.seasonId }] : []),
        ],
      },
      include: ["participant"],
      limit: 80,
    },
    { fresh: true },
  );

  const nameFor = (participantId: number, teamId: number) => {
    const matches = members.filter((member) => member.participantId === participantId);
    const member = matches.find((item) => item.teamId === teamId) ?? matches[0];
    return personName(member?.participant?.firstName, member?.participant?.lastName, member?.participant?.fullName);
  };

  const sideFor = (teamId: number) => {
    if (teamId === game.homeTeamId) return game.homeTeam;
    if (teamId === game.awayTeamId) return game.awayTeam;
    return undefined;
  };

  return [...goals]
    .sort((a, b) => {
      const periodA = Number(a.gameTime?.period ?? 0);
      const periodB = Number(b.gameTime?.period ?? 0);
      if (periodA !== periodB) return periodA - periodB;
      const elapsedA = (a.gameTime?.elapsedMinutes ?? 0) * 60 + (a.gameTime?.elapsedSeconds ?? 0);
      const elapsedB = (b.gameTime?.elapsedMinutes ?? 0) * 60 + (b.gameTime?.elapsedSeconds ?? 0);
      return elapsedA - elapsedB;
    })
    .map((goal) => {
      const side = sideFor(goal.teamId);
      const assists = (goal.assistIds ?? [])
        .slice(0, 2)
        .map((id) => nameFor(id, goal.teamId))
        .filter(Boolean);
      return {
        teamName: side?.shortName || side?.name || "",
        logoUrl: side?.logoUrl ?? null,
        scorer: nameFor(goal.participantId, goal.teamId) || "Joueur",
        assists,
        time: clockFromParts(goal.gameTime?.minutes, goal.gameTime?.seconds),
        period: periodLabel(goal.gameTime?.period),
        side: goal.teamId === game.homeTeamId ? "home" : "away",
      };
    });
}

async function getLhjmqGoals(gameId: number): Promise<GoalEventDto[]> {
  const url = new URL(HT_API);
  url.searchParams.set("feed", "statviewfeed");
  url.searchParams.set("view", "gameSummary");
  url.searchParams.set("game_id", String(gameId));
  url.searchParams.set("key", HT_KEY);
  url.searchParams.set("client_code", "lhjmq");
  url.searchParams.set("lang", "fr");
  url.searchParams.set("fmt", "json");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`LHJMQ ${res.status}`);
  const summary = parseMaybeJsonp(await res.text());
  const homeTeamId = Number(summary.homeTeam?.info?.id);

  return (summary.periods ?? []).flatMap((period) =>
    (period.goals ?? []).map((goal) => ({
      teamName: goal.team?.nickname || goal.team?.name || "",
      logoUrl: goal.team?.logo || null,
      scorer: personName(goal.scoredBy?.firstName, goal.scoredBy?.lastName) || "Joueur",
      assists: (goal.assists ?? [])
        .slice(0, 2)
        .map((assist) => personName(assist.firstName, assist.lastName))
        .filter(Boolean),
      time: goal.time || "",
      period: tidyPeriod(goal.period?.longName || periodLabel(goal.period?.id)),
      side: Number(goal.team?.id) === homeTeamId ? "home" : "away",
    })),
  );
}

function readLhsaaqDetails(html: string): LhsaaqDetails {
  const marker = "__gameDetails__ = '";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("Sommaire LHSAAQ introuvable");
  let cursor = start + marker.length;
  let raw = "";
  while (cursor < html.length) {
    const char = html[cursor];
    if (char === "\\") {
      raw += "\\" + (html[cursor + 1] ?? "");
      cursor += 2;
      continue;
    }
    if (char === "'") break;
    raw += char;
    cursor += 1;
  }
  return JSON.parse(unescapeJsString(raw)) as LhsaaqDetails;
}

async function getLhsaaqGoals(gameId: number): Promise<GoalEventDto[]> {
  const res = await fetch(`https://www.lhsaaq.com/resultats/partie-${gameId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`LHSAAQ ${res.status}`);
  const details = readLhsaaqDetails(await res.text());
  const players = new Map<number, string>();
  for (const team of details.teamList ?? []) {
    for (const player of team.players ?? []) {
      const name = personName(player.firstName, player.lastName, player.name);
      if (!name) continue;
      if (player.id) players.set(player.id, name);
      if (player.contactId) players.set(player.contactId, name);
    }
  }

  const goals = (details.eventList ?? []).filter((event) => event.eventTypeId === 1);
  return [...goals]
    .sort((a, b) => {
      const periodA = a.periodId ?? 0;
      const periodB = b.periodId ?? 0;
      if (periodA !== periodB) return periodA - periodB;
      return stampSeconds(a.time) - stampSeconds(b.time);
    })
    .map((event) => {
      const stats = event.statList ?? [];
      const scorerId = stats.find((stat) => stat.statTypeId === 6)?.playerId;
      const assistIds = stats
        .filter((stat) => stat.statTypeId === 7)
        .map((stat) => stat.playerId)
        .filter((id): id is number => typeof id === "number");
      const isHome = event.teamId === details.localTeamId;
      return {
        teamName: (isHome ? details.localTeamName : details.visitorTeamName) || "",
        logoUrl: (isHome ? details.localTeamAvatar : details.visitorTeamAvatar) || null,
        scorer: (scorerId ? players.get(scorerId) : "") || "Joueur",
        assists: assistIds
          .slice(0, 2)
          .map((id) => players.get(id) || "")
          .filter(Boolean),
        time: clockFromStamp(event.time),
        period: periodLabel(event.periodId),
        side: isHome ? "home" : "away",
      };
    });
}

export async function getGameGoals(source: GameSource, gameId: number): Promise<GoalEventDto[]> {
  if (source === "spordle") return getSpordleGoals(gameId);
  if (source === "lhjmq") return getLhjmqGoals(gameId);
  return getLhsaaqGoals(gameId);
}
