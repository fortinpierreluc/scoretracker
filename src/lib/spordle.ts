import { getFollowedArena, matchesFollowedArena } from "@/data/followed-arenas";
import type { ArenaId } from "@/data/followed-arenas";
import { followedTeams } from "@/data/followed-teams";
import type { SpordleTeamConfig } from "@/data/followed-teams";
import { rangeToDates } from "@/lib/dates";
import type {
  FollowedTeamDto,
  GameDto,
  GameRange,
  StandingsDto,
  StandingRowDto,
} from "@/lib/types";

const API_URL = process.env.SPORDLE_API_URL ?? "https://pub-api.play.spordle.com/api";
const API_KEY = process.env.SPORDLE_API_KEY ?? "";

type SpordleTeam = {
  id: number;
  name: string;
  shortName: string;
  logoUrl?: string | null;
  categoryId?: string;
  category?: SpordleCategory;
};

type SpordleCategory = {
  name?: string;
  nameFr?: string;
  gender?: string;
  class?: { shortName?: string; i18n?: { fr?: { shortName?: string; name?: string } } };
  division?: { name?: string; i18n?: { fr?: { name?: string } } };
  i18n?: { fr?: { name?: string } };
};

type SpordleSchedule = {
  id: number;
  name: string;
  type: string;
  categoryId?: string;
  category?: SpordleCategory;
};

type SpordleGame = {
  id: number;
  number: string;
  date: string;
  startTime: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  isLive?: boolean;
  scheduleId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam?: SpordleTeam;
  awayTeam?: SpordleTeam;
  category?: SpordleCategory;
  score?: Record<string, number>;
  teamStats?: Array<{ teamId: number; goalFor?: number; gameResult?: string }>;
  surface?: {
    name?: string;
    type?: string;
    sports?: string[];
    venue?: { name?: string; city?: string; region?: string };
  };
  period?: string | number | null;
  currentPeriod?: string | number | null;
  clock?: string | null;
  remainingTime?: string | null;
  timeRemaining?: string | null;
  gameTime?: { period?: string | number; clock?: string; remaining?: string } | null;
  liveGameInfo?: { period?: string | number; minutes?: number; seconds?: number } | null;
  schedule?: SpordleSchedule;
  officeId?: number;
};

type SpordleStanding = {
  teamId: number;
  ranking: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otl: number;
  points: number;
  goalFor: number;
  goalAgainst: number;
  diff: number;
  team?: SpordleTeam;
};

function spordleTeams(): SpordleTeamConfig[] {
  return followedTeams.filter((team): team is SpordleTeamConfig => team.source === "spordle");
}

function followedSpordleIds() {
  return new Set(spordleTeams().map((team) => team.id));
}

async function spordle<T>(path: string, filter?: unknown): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (filter !== undefined) {
    url.searchParams.set("filter", JSON.stringify(filter));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `API-Key ${API_KEY}` },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spordle ${res.status} ${path}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

function formatCategory(category?: SpordleCategory): string {
  if (!category) return "Hockey";
  const named = category.i18n?.fr?.name ?? category.nameFr;
  if (category.gender === "Integrated" && named) return named;

  const division =
    category.division?.i18n?.fr?.name ??
    (category.division?.name === "College" ? "Collégial" : category.division?.name);
  const klass = category.class?.i18n?.fr?.shortName ?? category.class?.shortName;
  const gender =
    category.gender === "Male" ? "Masculin" : category.gender === "Female" ? "Féminin" : "";
  const parts = [division, klass, gender].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return named ?? category.name ?? "Hockey";
}

function formatArena(game: SpordleGame): { arena: string; city: string } {
  const venue = game.surface?.venue;
  const name = venue?.name ?? "Aréna à confirmer";
  const cityParts = [venue?.city, venue?.region].filter(Boolean).join(", ");
  return {
    arena: name,
    city: cityParts,
  };
}

function isArsenalName(value?: string | null) {
  if (!value) return false;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized.includes("saint-louis") || normalized.includes("saint louis");
}

function gameShortName(team: SpordleTeam | undefined) {
  if (isArsenalName(team?.shortName) || isArsenalName(team?.name)) return "ARSENAL";
  return team?.shortName ?? team?.name ?? "Équipe";
}

function teamSide(team: SpordleTeam | undefined, teamId: number, followedIds: Set<number>) {
  return {
    id: team?.id ?? teamId,
    name: team?.name ?? "Équipe",
    shortName: gameShortName(team),
    logoUrl: team?.logoUrl ?? null,
    isFollowed: followedIds.has(team?.id ?? teamId),
  };
}

function scoreFor(game: SpordleGame, teamId: number): number | null {
  if (game.score && game.score[String(teamId)] !== undefined) {
    return game.score[String(teamId)];
  }
  const stats = game.teamStats?.find((row) => row.teamId === teamId);
  return stats?.goalFor ?? null;
}

function gameStatus(game: SpordleGame): GameDto["status"] {
  if (game.isLive) return "live";
  if (game.actualEndTime) return "final";
  const home = scoreFor(game, game.homeTeamId);
  const away = scoreFor(game, game.awayTeamId);
  const hasScore = home !== null && away !== null;
  if (hasScore && game.actualStartTime) return "final";
  if (game.actualStartTime && !game.actualEndTime) return "live";
  return "upcoming";
}

function formatPeriodLabel(period: string | number | null | undefined): string | null {
  if (period === null || period === undefined || period === "") return null;
  const raw = String(period).trim();
  if (/^(ot|overtime|prol)/i.test(raw)) return "Prolongation";
  if (/^(so|shootout|tirs|fusillade)/i.test(raw)) return "Fusillade";
  const digits = raw.match(/^P?(\d+)$/i)?.[1];
  if (!digits) return raw;
  const n = Number(digits);
  if (n === 1) return "1re période";
  if (n >= 2 && n <= 3) return `${n}e période`;
  return "Prolongation";
}

function formatRemainingClock(minutes?: number, seconds?: number, fallback?: string | null) {
  if (typeof minutes === "number" || typeof seconds === "number") {
    return `${minutes ?? 0}:${String(seconds ?? 0).padStart(2, "0")}`;
  }
  return fallback || null;
}

function liveClock(game: SpordleGame): { periodLabel: string | null; clock: string | null } {
  const period = game.liveGameInfo?.period ?? game.gameTime?.period ?? game.currentPeriod ?? game.period;
  const clock = formatRemainingClock(
    game.liveGameInfo?.minutes,
    game.liveGameInfo?.seconds,
    game.gameTime?.clock ??
      game.gameTime?.remaining ??
      game.clock ??
      game.remainingTime ??
      game.timeRemaining ??
      null,
  );
  return { periodLabel: formatPeriodLabel(period), clock };
}

async function getLeagueSchedules(officeId: number): Promise<SpordleSchedule[]> {
  const seasons = await spordle<Array<{ seasonId: string; isCurrent?: boolean }>>(
    `/sp/seasons?officeId=${officeId}`,
  );

  const current =
    seasons.find((season) => season.isCurrent)?.seasonId ??
    seasons[0]?.seasonId ??
    "2026-27";

  const schedules = await spordle<SpordleSchedule[]>(
    `/sp/schedules?officeId=${officeId}&seasonId=${current}`,
  );

  return schedules.filter((schedule) => schedule.type === "League");
}

function isHockeyGame(game: SpordleGame) {
  const sports = game.surface?.sports;
  if (Array.isArray(sports) && sports.length > 0) {
    return sports.includes("Hockey");
  }
  return game.surface?.type === "Ice" || !game.surface?.type;
}

function mapGame(
  game: SpordleGame,
  leagues: SpordleSchedule[],
  followedIds: Set<number>,
): GameDto {
  const { arena, city } = formatArena(game);
  const { periodLabel, clock } = liveClock(game);
  const schedule = game.schedule ?? leagues.find((item) => item.id === game.scheduleId);
  const status = gameStatus(game);
  return {
    id: game.id,
    number: game.number,
    date: game.date,
    startTime: game.startTime,
    status,
    periodLabel: status === "live" ? periodLabel : null,
    clock: status === "live" ? clock : null,
    arena,
    city,
    category: formatCategory(game.category),
    scheduleName: schedule?.name ?? "Saison régulière",
    home: teamSide(game.homeTeam, game.homeTeamId, followedIds),
    away: teamSide(game.awayTeam, game.awayTeamId, followedIds),
    homeScore: status === "upcoming" ? null : scoreFor(game, game.homeTeamId),
    awayScore: status === "upcoming" ? null : scoreFor(game, game.awayTeamId),
  };
}

export async function getLeagueGamesForTeams(
  officeId: number,
  teamIds: number[],
  from: string,
  to: string,
  followedIds: Set<number>,
): Promise<GameDto[]> {
  if (!teamIds.length) return [];

  const leagues = await getLeagueSchedules(officeId);
  const leagueIds = new Set(leagues.map((schedule) => schedule.id));
  const games = await spordle<SpordleGame[]>("/sp/games", {
    order: ["startTime ASC", "number ASC"],
    where: {
      and: [
        { date: { between: [from, to] } },
        {
          or: teamIds.flatMap((id) => [{ awayTeamId: id }, { homeTeamId: id }]),
        },
        { officeId },
      ],
    },
    include: ["teamStats", "surface", "category", "awayTeam", "homeTeam"],
  });

  const unique = new Map<number, SpordleGame>();
  for (const game of games) {
    if (!leagueIds.has(game.scheduleId)) continue;
    unique.set(game.id, game);
  }

  return [...unique.values()]
    .map((game) => mapGame(game, leagues, followedIds))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function getSpordleGames(range: GameRange): Promise<GameDto[]> {
  const teams = spordleTeams();
  if (!teams.length) return [];

  const followedIds = followedSpordleIds();
  const { from, to } = rangeToDates(range);
  const byOffice = new Map<number, number[]>();
  for (const team of teams) {
    const list = byOffice.get(team.officeId) ?? [];
    list.push(team.id);
    byOffice.set(team.officeId, list);
  }

  const batches = await Promise.all(
    [...byOffice.entries()].map(([officeId, ids]) =>
      getLeagueGamesForTeams(officeId, ids, from, to, followedIds),
    ),
  );

  return batches.flat().sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function getSpordleArenaGames(arenaId: ArenaId, range: GameRange): Promise<GameDto[]> {
  const arena = getFollowedArena(arenaId);
  const followedIds = followedSpordleIds();
  const { from, to } = rangeToDates(range);

  const games = await spordle<SpordleGame[]>("/sp/games", {
    order: ["startTime ASC", "number ASC"],
    where: {
      and: [
        { date: { between: [from, to] } },
        {
          or: arena.likes.map((like) => ({
            surface: { venue: { name: { like } } },
          })),
        },
        { schedule: { type: "League" } },
      ],
    },
    include: ["teamStats", "surface", "category", "awayTeam", "homeTeam", "schedule"],
  });

  const unique = new Map<number, GameDto>();
  for (const game of games) {
    if (!matchesFollowedArena(game.surface?.venue?.name, arena)) continue;
    if (!isHockeyGame(game)) continue;
    unique.set(game.id, mapGame(game, game.schedule ? [game.schedule] : [], followedIds));
  }

  return [...unique.values()].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

export async function getSpordleTeamSummaries(): Promise<FollowedTeamDto[]> {
  const summaries: FollowedTeamDto[] = [];

  for (const config of spordleTeams()) {
    const leagues = await getLeagueSchedules(config.officeId);
    const teamResponse = await spordle<SpordleTeam | SpordleTeam[]>(`/sp/teams/${config.id}`).catch(
      () => null,
    );
    const resolvedTeam = Array.isArray(teamResponse) ? teamResponse[0] : teamResponse;

    const teamSchedules = await spordle<SpordleSchedule[]>(`/sp/teams/${config.id}/schedules`, {
      where: { effectiveOffices: [config.officeId] },
      include: ["category"],
    });

    const league =
      teamSchedules.find((schedule) => schedule.type === "League") ??
      leagues.find(
        (schedule) => schedule.categoryId && schedule.categoryId === resolvedTeam?.categoryId,
      );

    let record = "0-0-0";
    let ranking: number | null = null;
    let points: number | null = null;

    if (league) {
      const standings = await spordle<SpordleStanding[]>(`/sp/schedules/${league.id}/teamStats`, {
        where: { team: { name: { neq: "TBA" }, id: config.id } },
        include: ["team"],
      });
      const row = standings.find((item) => item.teamId === config.id);
      if (row) {
        record = `${row.wins ?? 0}-${row.losses ?? 0}-${row.otl ?? 0}`;
        ranking = row.ranking;
        points = row.points ?? 0;
      }
    }

    summaries.push({
      id: config.id,
      name: resolvedTeam?.name ?? config.nickname,
      shortName: resolvedTeam?.shortName ?? config.nickname,
      nickname: config.nickname,
      logoUrl: resolvedTeam?.logoUrl ?? null,
      category: formatCategory(league?.category ?? resolvedTeam?.category),
      scheduleId: league?.id ?? null,
      scheduleName: league?.name ?? null,
      record,
      ranking,
      points,
      url: config.url,
    });
  }

  return summaries;
}

export async function getSpordleStandingsOptions(): Promise<
  Array<{ scheduleId: number; scheduleName: string; category: string }>
> {
  const teams = await getSpordleTeamSummaries();
  const seen = new Set<number>();
  const options: Array<{ scheduleId: number; scheduleName: string; category: string }> = [];

  for (const team of teams) {
    if (!team.scheduleId || seen.has(team.scheduleId)) continue;
    seen.add(team.scheduleId);
    options.push({
      scheduleId: team.scheduleId,
      scheduleName: team.scheduleName ?? "Saison régulière",
      category: team.category,
    });
  }

  return options;
}

export { formatCategory, getLeagueSchedules, spordle };

export async function getSpordleStandings(scheduleId: number): Promise<StandingsDto> {
  const followedIds = followedSpordleIds();
  const offices = [...new Set(spordleTeams().map((team) => team.officeId))];
  const leagues = (await Promise.all(offices.map((officeId) => getLeagueSchedules(officeId)))).flat();
  const schedule = leagues.find((item) => item.id === scheduleId);

  if (!schedule) {
    throw new Error("Classement introuvable pour cette saison régulière.");
  }

  const rows = await spordle<SpordleStanding[]>(`/sp/schedules/${scheduleId}/teamStats`, {
    where: { team: { name: { neq: "TBA" } } },
    include: ["team", "group"],
  });

  const mapped: StandingRowDto[] = rows
    .map((row) => ({
      teamId: row.teamId,
      ranking: row.ranking,
      name: row.team?.name ?? "Équipe",
      shortName: row.team?.shortName ?? row.team?.name ?? "Équipe",
      logoUrl: row.team?.logoUrl ?? null,
      gamesPlayed: row.gamesPlayed,
      wins: row.wins,
      losses: row.losses,
      otl: row.otl ?? 0,
      points: row.points,
      goalFor: row.goalFor,
      goalAgainst: row.goalAgainst,
      diff: row.diff,
      isFollowed: followedIds.has(row.teamId),
    }))
    .sort((a, b) => a.ranking - b.ranking);

  return {
    scheduleId,
    scheduleName: schedule.name,
    category: formatCategory(schedule.category),
    rows: mapped,
  };
}
