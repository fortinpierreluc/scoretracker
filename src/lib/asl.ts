import { ASL_CLUB_OFFICE_ID, ASL_LEAGUE_OFFICE_ID, aslTeamUrl } from "@/data/asl";
import { rangeToDates, shiftDate, sortGamesByStart, todayInMontreal } from "@/lib/dates";
import {
  formatCategory,
  getLeagueGamesForTeams,
  getLeagueSchedules,
  spordle,
} from "@/lib/spordle";
import type { AslTeamRowDto, GameDto, GameRange, LastFiveResult } from "@/lib/types";

type AslSpordleTeam = {
  id: number;
  name: string;
  shortName: string;
  logoUrl?: string | null;
  categoryId?: string;
  seasonId?: string;
  category?: {
    name?: string;
    nameFr?: string;
    gender?: string;
    class?: { shortName?: string; i18n?: { fr?: { shortName?: string; name?: string } } };
    division?: { name?: string; i18n?: { fr?: { name?: string } } };
    i18n?: { fr?: { name?: string } };
  };
};

type AslStanding = {
  teamId: number;
  ranking: number;
  wins: number;
  losses: number;
  otl: number;
  points: number;
};

type AslMember = {
  teamId: number;
  positions?: string[];
  participant?: { fullName?: string; firstName?: string; lastName?: string };
};

export function compactCategory(category: string): string {
  const female = /féminin|female/i.test(category);
  const releve = /rel[èe]ve/i.test(category);
  const nextGen = /next gen/i.test(category);
  const ageMatch =
    category.match(/M\s*(\d{2})/i) ?? category.match(/Moins de (\d+)/i) ?? category.match(/U(\d{2})/i);
  const klass = category.match(/D[123]/i)?.[0]?.toUpperCase() ?? "";
  const age = ageMatch?.[1] ? `M${ageMatch[1]}` : nextGen ? "M15" : "";
  const extra = releve ? "Relève" : nextGen ? "Next Gen" : "";
  if (age) {
    return [age, klass, extra, female ? "Fém." : ""].filter(Boolean).join(" ");
  }
  return [klass, extra, female ? "Fém." : ""].filter(Boolean).join(" ") || category;
}

function formatPersonName(name: string) {
  return name
    .toLocaleLowerCase("fr-CA")
    .replace(/(?:^|[\s'-])\S/g, (chunk) => chunk.toLocaleUpperCase("fr-CA"));
}

function categorySortKey(category: string) {
  const compact = compactCategory(category);
  const age = Number(compact.match(/M(\d{2})/)?.[1] ?? 99);
  const female = compact.includes("Fém.") ? 1 : 0;
  const division = compact.includes("D3") ? 4 : compact.includes("D2") ? 3 : compact.includes("Relève") ? 2 : 1;
  return [age, female, division, compact] as const;
}

async function currentSeasonId(officeId: number) {
  const seasons = await spordle<Array<{ seasonId: string; isCurrent?: boolean }>>(
    `/sp/seasons?officeId=${officeId}`,
  );
  return seasons.find((season) => season.isCurrent)?.seasonId ?? seasons[0]?.seasonId ?? "2026-27";
}

export async function getAslTeams(): Promise<AslSpordleTeam[]> {
  const seasonId = await currentSeasonId(ASL_CLUB_OFFICE_ID);
  const teams = await spordle<AslSpordleTeam[]>("/sp/teams", {
    where: { officeId: ASL_CLUB_OFFICE_ID, seasonId },
    include: ["category"],
  });
  return teams.sort((a, b) => {
    const ca = formatCategory(a.category);
    const cb = formatCategory(b.category);
    const ka = categorySortKey(ca);
    const kb = categorySortKey(cb);
    for (let i = 0; i < ka.length; i += 1) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return 0;
  });
}

export async function getAslGames(range: GameRange): Promise<GameDto[]> {
  const teams = await getAslTeams();
  const ids = teams.map((team) => team.id);
  const { from, to } = rangeToDates(range);
  const games = await getLeagueGamesForTeams(ASL_LEAGUE_OFFICE_ID, ids, from, to, new Set(ids));
  return sortGamesByStart(games, range);
}

function resultForTeam(game: GameDto, teamId: number): LastFiveResult | null {
  if (game.status !== "final") return null;
  const teamScore = game.home.id === teamId ? game.homeScore : game.awayScore;
  const oppScore = game.home.id === teamId ? game.awayScore : game.homeScore;
  if (teamScore === null || oppScore === null) return null;
  if (teamScore > oppScore) return "V";
  if (teamScore < oppScore) return "D";
  return "N";
}

export async function getAslTeamRows(): Promise<AslTeamRowDto[]> {
  const teams = await getAslTeams();
  const ids = teams.map((team) => team.id);
  const aslIds = new Set(ids);
  const today = todayInMontreal();
  const historyFrom = shiftDate(today, -60);

  const [leagues, members, history] = await Promise.all([
    getLeagueSchedules(ASL_LEAGUE_OFFICE_ID),
    spordle<AslMember[]>("/sp/members", {
      where: { teamId: { inq: ids } },
      include: ["participant"],
    }).catch(() => [] as AslMember[]),
    getLeagueGamesForTeams(ASL_LEAGUE_OFFICE_ID, ids, historyFrom, today, aslIds),
  ]);

  const leagueByCategory = new Map(
    leagues
      .filter((league) => league.categoryId)
      .map((league) => [league.categoryId as string, league]),
  );
  const scheduleIds = [
    ...new Set(
      teams
        .map((team) => (team.categoryId ? leagueByCategory.get(team.categoryId)?.id : undefined))
        .filter((id): id is number => typeof id === "number"),
    ),
  ];

  const standingsBySchedule = new Map<number, AslStanding[]>();
  await Promise.all(
    scheduleIds.map(async (scheduleId) => {
      const rows = await spordle<AslStanding[]>(`/sp/schedules/${scheduleId}/teamStats`, {
        where: { team: { name: { neq: "TBA" } } },
        include: ["team"],
      });
      standingsBySchedule.set(scheduleId, rows);
    }),
  );

  const coachByTeam = new Map<number, string>();
  for (const member of members) {
    if (!member.positions?.includes("Head Coach")) continue;
    const raw =
      member.participant?.fullName ??
      [member.participant?.firstName, member.participant?.lastName].filter(Boolean).join(" ");
    if (raw) coachByTeam.set(member.teamId, formatPersonName(raw));
  }

  return teams.map((team) => {
    const category = formatCategory(team.category);
    const league = team.categoryId ? leagueByCategory.get(team.categoryId) : undefined;
    const rows = league ? (standingsBySchedule.get(league.id) ?? []) : [];
    const row = rows.find((item) => item.teamId === team.id);
    const lastFive = history
      .filter((game) => game.home.id === team.id || game.away.id === team.id)
      .map((game) => resultForTeam(game, team.id))
      .filter((result): result is LastFiveResult => result !== null)
      .slice(-5);

    return {
      id: team.id,
      name: team.name,
      shortName: compactCategory(category),
      logoUrl: team.logoUrl ?? null,
      category,
      coach: coachByTeam.get(team.id) ?? null,
      record: row ? `${row.wins ?? 0}-${row.losses ?? 0}-${row.otl ?? 0}` : "0-0-0",
      ranking: row?.ranking ?? null,
      teamCount: rows.length || null,
      lastFive,
      url: aslTeamUrl(team.id),
    };
  });
}
