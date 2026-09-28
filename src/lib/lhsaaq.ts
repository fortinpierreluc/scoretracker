import { matchesFollowedArena } from "@/data/followed-arenas";
import type { FollowedArena } from "@/data/followed-arenas";
import { followedTeams } from "@/data/followed-teams";
import type { KreezeeTeamConfig } from "@/data/followed-teams";
import { rangeToDates } from "@/lib/dates";
import type {
  FollowedTeamDto,
  GameDto,
  GameRange,
  StandingsDto,
  StandingRowDto,
} from "@/lib/types";

const LHSAAQ_API = "https://www.lhsaaq.com/api/v2";
const KREEZEE_API = "https://api.kreezee.com/api";
const LHSAAQ_SOLUTION_ID = 23819;
const LHSAAQ_CATEGORY = "Senior AA";

type KreezeeProperty = { name: string; value: string | null };
type KreezeeGame = {
  Id: number;
  Number: string;
  Date: string;
  StartTime: string | null;
  Time: string | null;
  Final: boolean;
  StatusId: number;
  PeriodId: number | null;
  LocalTeamId: number;
  LocalTeamName: string;
  LocalTeamAvatar: string;
  LocalResult: number;
  VisitorTeamId: number;
  VisitorTeamName: string;
  VisitorTeamAvatar: string;
  VisitorResult: number;
  SportCenterName: string | null;
  SeasonId: number;
  Properties?: KreezeeProperty[];
};

type KreezeeSeason = {
  Id: number;
  TypeId: number;
  Name: string;
  StartingDate: string;
  EndingDate: string;
};

type KreezeeStat = { statTypeId: number; value: number; displayValue?: string };
type KreezeeTeamRow = {
  id: number;
  name: string;
  fullName?: string;
  abbreviation?: string;
  avatar?: string;
  index?: number;
  rank?: number | null;
  stats?: KreezeeStat[];
};

const STAT = {
  GP: 1,
  W: 2,
  L: 3,
  T: 4,
  OTL: 5,
  SOL: 6,
  GF: 7,
  GA: 8,
  DIFF: 9,
  PTS: 15,
};

function kreezeeTeams(): KreezeeTeamConfig[] {
  return followedTeams.filter((team): team is KreezeeTeamConfig => team.source === "kreezee");
}

async function kreezeeFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new Error(`LHSAAQ ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

async function getRegularSeason(solutionId: number): Promise<KreezeeSeason> {
  const seasons = await kreezeeFetch<KreezeeSeason[]>(`${LHSAAQ_API}/solutions/${solutionId}/seasons?`);
  const regular =
    seasons.find((season) => season.TypeId === 1 && /r[eé]guli/i.test(season.Name)) ??
    seasons.find((season) => season.TypeId === 1);
  if (!regular) {
    throw new Error("Saison régulière LHSAAQ introuvable.");
  }
  return regular;
}

function torontoStart(date: string, startTime: string | null): string {
  const day = date.slice(0, 10);
  const time = (startTime || "00:00:00").slice(0, 8);
  const month = Number(day.slice(5, 7));
  const offset = month >= 3 && month <= 10 ? "-04:00" : "-05:00";
  return `${day}T${time}${offset}`;
}

function shortNameFromFull(name: string) {
  const match = name.match(/^(.+?)\s+de\s+/i);
  return (match ? match[1] : name).toUpperCase();
}

function property(game: KreezeeGame, name: string) {
  return game.Properties?.find((item) => item.name === name)?.value ?? null;
}

function gameStatus(game: KreezeeGame): GameDto["status"] {
  if (game.Final || game.StatusId === 3) return "final";
  if (game.StatusId === 2 || (game.PeriodId !== null && game.PeriodId !== undefined)) return "live";
  return "upcoming";
}

function formatClock(time: string | null) {
  if (!time || time === "00:00:00") return null;
  const parts = time.split(":");
  if (parts.length >= 3) return `${parts[1]}:${parts[2]}`;
  return time;
}

function statValue(row: KreezeeTeamRow, typeId: number) {
  return row.stats?.find((stat) => stat.statTypeId === typeId)?.value ?? 0;
}

function mapLhsaaqGame(
  game: KreezeeGame,
  season: KreezeeSeason,
  followedIds: Set<number>,
  category: string,
): GameDto {
  const status = gameStatus(game);
  const startTime = torontoStart(game.Date, game.StartTime);
  return {
    id: game.Id,
    number: game.Number ? `SR-${game.Number}` : "",
    date: game.Date.slice(0, 10),
    startTime,
    status,
    periodLabel: status === "live" && game.PeriodId ? `${game.PeriodId}e` : null,
    clock: status === "live" ? formatClock(game.Time) : null,
    arena: game.SportCenterName ?? "Aréna à confirmer",
    city: "",
    category,
    scheduleName: season.Name,
    home: {
      id: game.LocalTeamId,
      name: game.LocalTeamName,
      shortName: shortNameFromFull(game.LocalTeamName),
      logoUrl: game.LocalTeamAvatar || null,
      isFollowed: followedIds.has(game.LocalTeamId),
    },
    away: {
      id: game.VisitorTeamId,
      name: game.VisitorTeamName,
      shortName: shortNameFromFull(game.VisitorTeamName),
      logoUrl: game.VisitorTeamAvatar || null,
      isFollowed: followedIds.has(game.VisitorTeamId),
    },
    homeScore: status === "upcoming" ? null : game.LocalResult,
    awayScore: status === "upcoming" ? null : game.VisitorResult,
    source: "lhsaaq",
  };
}

async function fetchLhsaaqSchedule(from: string, to: string) {
  const season = await getRegularSeason(LHSAAQ_SOLUTION_ID);
  const games = await kreezeeFetch<KreezeeGame[]>(
    `${LHSAAQ_API}/solutions/${LHSAAQ_SOLUTION_ID}/seasons/${season.Id}/schedule?startDate=${from}%2000:00:00&endDate=${to}%2023:59:59`,
  );
  return { season, games };
}

export async function getLhsaaqGames(range: GameRange): Promise<GameDto[]> {
  const teams = kreezeeTeams();
  if (!teams.length) return [];

  const { from, to } = rangeToDates(range);
  const followedIds = new Set(teams.map((team) => team.id));
  const { season, games } = await fetchLhsaaqSchedule(from, to);

  return games
    .filter((game) => followedIds.has(game.LocalTeamId) || followedIds.has(game.VisitorTeamId))
    .filter((game) => property(game, "GameType") !== "preseason")
    .map((game) => mapLhsaaqGame(game, season, followedIds, teams[0].category));
}

export async function getLhsaaqArenaGames(
  arena: FollowedArena,
  range: GameRange,
): Promise<GameDto[]> {
  const { from, to } = rangeToDates(range);
  const followedIds = new Set(kreezeeTeams().map((team) => team.id));
  const { season, games } = await fetchLhsaaqSchedule(from, to);

  return games
    .filter((game) => property(game, "GameType") !== "preseason")
    .filter((game) => matchesFollowedArena(game.SportCenterName, arena))
    .map((game) => mapLhsaaqGame(game, season, followedIds, LHSAAQ_CATEGORY));
}

export async function getLhsaaqTeamSummaries(): Promise<FollowedTeamDto[]> {
  const teams = kreezeeTeams();
  if (!teams.length) return [];

  const solutionId = teams[0].solutionId;
  const season = await getRegularSeason(solutionId);
  const standings = await getLhsaaqStandings(season.Id).catch(() => null);

  return teams.map((team) => {
    const row = standings?.rows.find((item) => item.teamId === team.id);
    return {
      id: team.id,
      name: team.nickname,
      shortName: team.shortName,
      nickname: team.nickname,
      logoUrl: team.logoUrl,
      category: team.category,
      scheduleId: season.Id,
      scheduleName: season.Name,
      record: row ? `${row.wins}-${row.losses}-${row.otl}` : "0-0-0",
      ranking: row?.ranking ?? null,
      points: row?.points ?? 0,
      url: team.url,
    };
  });
}

export async function getLhsaaqStandingsOptions() {
  const teams = kreezeeTeams();
  if (!teams.length) return [];
  const season = await getRegularSeason(teams[0].solutionId);
  return [
    {
      scheduleId: season.Id,
      scheduleName: season.Name,
      category: teams[0].category,
    },
  ];
}

export async function getLhsaaqStandings(seasonId?: number): Promise<StandingsDto> {
  const teams = kreezeeTeams();
  if (!teams.length) {
    throw new Error("Aucune équipe LHSAAQ suivie.");
  }
  const solutionId = teams[0].solutionId;
  const season = seasonId
    ? { Id: seasonId, Name: "Saison régulière", TypeId: 1 }
    : await getRegularSeason(solutionId);
  const followedIds = new Set(teams.map((team) => team.id));

  const payload = await kreezeeFetch<{ results: KreezeeTeamRow[] }>(
    `${KREEZEE_API}/solution/${solutionId}/team/statistics?page=1&pageSize=10000&sortStatId=${STAT.PTS}&sortOrder=desc&automatedStats=false&seasonId=${season.Id}`,
  );

  const rows: StandingRowDto[] = (payload.results ?? [])
    .map((row, index) => ({
      teamId: row.id,
      ranking: row.rank || row.index || index + 1,
      name: row.fullName || row.name,
      shortName: shortNameFromFull(row.name),
      logoUrl: row.avatar || null,
      gamesPlayed: statValue(row, STAT.GP),
      wins: statValue(row, STAT.W),
      losses: statValue(row, STAT.L),
      otl: statValue(row, STAT.OTL) + statValue(row, STAT.SOL),
      points: statValue(row, STAT.PTS),
      goalFor: statValue(row, STAT.GF),
      goalAgainst: statValue(row, STAT.GA),
      diff: statValue(row, STAT.DIFF) || statValue(row, STAT.GF) - statValue(row, STAT.GA),
      isFollowed: followedIds.has(row.id),
    }))
    .sort((a, b) => a.ranking - b.ranking || b.points - a.points);

  return {
    scheduleId: season.Id,
    scheduleName: "Name" in season ? season.Name : "Saison régulière",
    category: teams[0].category,
    rows,
  };
}

export async function isLhsaaqSchedule(scheduleId: number) {
  const options = await getLhsaaqStandingsOptions();
  return options.some((option) => option.scheduleId === scheduleId);
}
