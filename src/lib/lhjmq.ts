import { followedTeams } from "@/data/followed-teams";
import type { HockeyTechTeamConfig } from "@/data/followed-teams";
import { rangeToDates } from "@/lib/dates";
import type {
  FollowedTeamDto,
  GameDto,
  GameRange,
  StandingsDto,
  StandingRowDto,
} from "@/lib/types";

const HT_API = "https://lscluster.hockeytech.com/feed/index.php";
const HT_KEY = "f1aa699db3d81487";
const LHJMQ_CATEGORY = "LHJMQ";

type HtSeason = {
  season_id: string;
  season_name: string;
  playoff: string;
  career: string;
  start_date: string;
  end_date: string;
};

type HtTeam = {
  id: string;
  name: string;
  city: string;
  code: string;
  nickname: string;
  division_long_name?: string;
  team_logo_url?: string;
};

type HtGame = {
  id: string;
  game_id: string;
  game_number: string;
  date_played: string;
  GameDateISO8601: string;
  schedule_time: string | null;
  timezone?: string;
  final: string;
  started: string;
  game_status: string;
  period: string;
  period_trans?: string;
  game_clock: string;
  overtime?: string;
  shootout?: string;
  home_team: string;
  visiting_team: string;
  home_goal_count: string;
  visiting_goal_count: string;
  home_team_name: string;
  home_team_nickname: string;
  visiting_team_name: string;
  visiting_team_nickname: string;
  venue_name: string | null;
  venue_location: string | null;
};

function hockeyTechTeams(): HockeyTechTeamConfig[] {
  return followedTeams.filter((team): team is HockeyTechTeamConfig => team.source === "hockeytech");
}

async function hockeyTech<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(HT_API);
  url.searchParams.set("feed", "modulekit");
  url.searchParams.set("key", HT_KEY);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("lang", "fr");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new Error(`LHJMQ ${res.status}: ${url.pathname}`);
  }
  return res.json() as Promise<T>;
}

async function getRegularSeason(clientCode: string): Promise<HtSeason> {
  const payload = await hockeyTech<{ SiteKit: { Seasons: HtSeason[] } }>({
    client_code: clientCode,
    view: "seasons",
  });
  const seasons = payload.SiteKit.Seasons ?? [];
  const regular =
    seasons.find(
      (season) => season.playoff === "0" && season.career === "1" && /r[eé]guli/i.test(season.season_name),
    ) ?? seasons.find((season) => season.playoff === "0" && season.career === "1");
  if (!regular) {
    throw new Error("Saison régulière LHJMQ introuvable.");
  }
  return regular;
}

function logoFor(teamId: string | number) {
  return `https://assets.leaguestat.com/lhjmq/logos/${teamId}.png`;
}

function formatClock(clock: string | null | undefined) {
  if (!clock || clock === "00:00:00") return null;
  const parts = clock.split(":");
  if (parts.length === 3 && parts[0] === "00") return `${parts[1]}:${parts[2]}`;
  if (parts.length === 3) return `${parts[1]}:${parts[2]}`;
  return clock;
}

function gameStatus(game: HtGame): GameDto["status"] {
  if (game.final === "1" || /final/i.test(game.game_status)) return "final";
  if (game.started === "1") return "live";
  return "upcoming";
}

function mapGame(game: HtGame, followedIds: Set<number>): GameDto {
  const status = gameStatus(game);
  const homeId = Number(game.home_team);
  const awayId = Number(game.visiting_team);
  return {
    id: Number(game.game_id || game.id),
    number: game.game_number ? `LHJMQ-${game.game_number}` : "",
    date: game.date_played,
    startTime: game.GameDateISO8601 || `${game.date_played}T${(game.schedule_time || "00:00:00").slice(0, 8)}-04:00`,
    status,
    periodLabel: status === "live" ? (game.period_trans || (game.period ? `P${game.period}` : null)) : null,
    clock: status === "live" ? formatClock(game.game_clock) : null,
    arena: game.venue_name || "Aréna à confirmer",
    city: game.venue_location?.replace(/\s+/g, " ").trim() ?? "",
    category: LHJMQ_CATEGORY,
    scheduleName: "Saison régulière",
    home: {
      id: homeId,
      name: game.home_team_name,
      shortName: (game.home_team_nickname || game.home_team_name).toUpperCase(),
      logoUrl: logoFor(homeId),
      isFollowed: followedIds.has(homeId),
    },
    away: {
      id: awayId,
      name: game.visiting_team_name,
      shortName: (game.visiting_team_nickname || game.visiting_team_name).toUpperCase(),
      logoUrl: logoFor(awayId),
      isFollowed: followedIds.has(awayId),
    },
    homeScore: status === "upcoming" ? null : Number(game.home_goal_count),
    awayScore: status === "upcoming" ? null : Number(game.visiting_goal_count),
  };
}

export async function getLhjmqGames(range: GameRange): Promise<GameDto[]> {
  const teams = hockeyTechTeams();
  if (!teams.length) return [];

  const { from, to } = rangeToDates(range);
  const followedIds = new Set(teams.map((team) => team.id));
  const clientCode = teams[0].clientCode;
  const season = await getRegularSeason(clientCode);

  const batches = await Promise.all(
    teams.map(async (team) => {
      const payload = await hockeyTech<{ SiteKit: { Schedule: HtGame[] } }>({
        client_code: clientCode,
        view: "schedule",
        season_id: season.season_id,
        team_id: String(team.id),
      });
      return payload.SiteKit.Schedule ?? [];
    }),
  );

  const unique = new Map<number, GameDto>();
  for (const game of batches.flat()) {
    if (game.date_played < from || game.date_played > to) continue;
    const mapped = mapGame(game, followedIds);
    unique.set(mapped.id, mapped);
  }

  return [...unique.values()].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

function emptyRow(team: HtTeam): StandingRowDto {
  return {
    teamId: Number(team.id),
    ranking: 0,
    name: team.name,
    shortName: (team.nickname || team.name).toUpperCase(),
    logoUrl: team.team_logo_url || logoFor(team.id),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    otl: 0,
    points: 0,
    goalFor: 0,
    goalAgainst: 0,
    diff: 0,
    isFollowed: false,
  };
}

export async function getLhjmqStandings(seasonId?: number): Promise<StandingsDto> {
  const teams = hockeyTechTeams();
  const clientCode = teams[0]?.clientCode ?? "lhjmq";
  const season = seasonId
    ? { season_id: String(seasonId), season_name: "Saison régulière" }
    : await getRegularSeason(clientCode);
  const followedIds = new Set(teams.map((team) => team.id));

  const [teamsPayload, schedulePayload] = await Promise.all([
    hockeyTech<{ SiteKit: { Teamsbyseason: HtTeam[] } }>({
      client_code: clientCode,
      view: "teamsbyseason",
      season_id: season.season_id,
    }),
    hockeyTech<{ SiteKit: { Schedule: HtGame[] } }>({
      client_code: clientCode,
      view: "schedule",
      season_id: season.season_id,
    }),
  ]);

  const rowsById = new Map<number, StandingRowDto>();
  for (const team of teamsPayload.SiteKit.Teamsbyseason ?? []) {
    const row = emptyRow(team);
    row.isFollowed = followedIds.has(row.teamId);
    rowsById.set(row.teamId, row);
  }

  for (const game of schedulePayload.SiteKit.Schedule ?? []) {
    if (game.final !== "1") continue;
    const home = rowsById.get(Number(game.home_team));
    const away = rowsById.get(Number(game.visiting_team));
    if (!home || !away) continue;

    const homeGoals = Number(game.home_goal_count);
    const awayGoals = Number(game.visiting_goal_count);
    const extra = game.overtime === "1" || game.shootout === "1";

    home.gamesPlayed += 1;
    away.gamesPlayed += 1;
    home.goalFor += homeGoals;
    home.goalAgainst += awayGoals;
    away.goalFor += awayGoals;
    away.goalAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins += 1;
      home.points += 2;
      if (extra) {
        away.otl += 1;
        away.points += 1;
      } else {
        away.losses += 1;
      }
    } else if (awayGoals > homeGoals) {
      away.wins += 1;
      away.points += 2;
      if (extra) {
        home.otl += 1;
        home.points += 1;
      } else {
        home.losses += 1;
      }
    }
  }

  const rows = [...rowsById.values()]
    .map((row) => ({ ...row, diff: row.goalFor - row.goalAgainst }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.diff - a.diff)
    .map((row, index) => ({ ...row, ranking: index + 1 }));

  return {
    scheduleId: Number(season.season_id),
    scheduleName: season.season_name,
    category: LHJMQ_CATEGORY,
    rows,
  };
}

export async function getLhjmqTeamSummaries(): Promise<FollowedTeamDto[]> {
  const teams = hockeyTechTeams();
  if (!teams.length) return [];
  const standings = await getLhjmqStandings().catch(() => null);

  return teams.map((team) => {
    const row = standings?.rows.find((item) => item.teamId === team.id);
    return {
      id: team.id,
      name: team.nickname,
      shortName: team.shortName,
      nickname: team.nickname,
      logoUrl: team.logoUrl,
      category: team.category,
      scheduleId: standings?.scheduleId ?? null,
      scheduleName: standings?.scheduleName ?? null,
      record: row ? `${row.wins}-${row.losses}-${row.otl}` : "0-0-0",
      ranking: row?.ranking ?? null,
      points: row?.points ?? 0,
      url: team.url,
    };
  });
}

export async function getLhjmqStandingsOptions() {
  const teams = hockeyTechTeams();
  if (!teams.length) return [];
  const season = await getRegularSeason(teams[0].clientCode);
  return [
    {
      scheduleId: Number(season.season_id),
      scheduleName: season.season_name,
      category: LHJMQ_CATEGORY,
    },
  ];
}

export async function isLhjmqSchedule(scheduleId: number) {
  const options = await getLhjmqStandingsOptions();
  return options.some((option) => option.scheduleId === scheduleId);
}
