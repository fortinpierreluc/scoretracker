import { programsForGroups, slqneTeamUrl } from "@/data/slqne";
import type { SlqneGroupId, SlqneProgram } from "@/data/slqne";
import {
  categorySortKey,
  compactCategory,
  currentSeasonId,
  formatPersonName,
  resultForTeam,
} from "@/lib/asl";
import { rangeToDates, shiftDate, sortGamesByStart, todayInMontreal } from "@/lib/dates";
import { formatCategory, getRegularSeasonGamesForTeams, spordle } from "@/lib/spordle";
import type { GameDto, GameRange, LastFiveResult, SlqneTeamRowDto } from "@/lib/types";

type SpordleTeam = {
  id: number;
  name: string;
  shortName: string;
  logoUrl?: string | null;
  category?: Parameters<typeof formatCategory>[0];
};

type TeamWithProgram = { team: SpordleTeam; program: SlqneProgram };

type Standing = {
  teamId: number;
  ranking: number;
  wins: number;
  losses: number;
  otl: number;
};

type Member = {
  teamId: number;
  positions?: string[];
  participant?: { fullName?: string; firstName?: string; lastName?: string };
};

const HISTORY_DAYS = 120;

function compareTeams(a: SpordleTeam, b: SpordleTeam) {
  const ka = categorySortKey(formatCategory(a.category));
  const kb = categorySortKey(formatCategory(b.category));
  for (let i = 0; i < ka.length; i += 1) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

async function getProgramTeams(program: SlqneProgram): Promise<TeamWithProgram[]> {
  const seasonId = await currentSeasonId(program.officeId);
  const teams = await spordle<SpordleTeam[]>("/sp/teams", {
    where: { officeId: program.officeId, seasonId },
    include: ["category"],
  });
  return teams.sort(compareTeams).map((team) => ({ team, program }));
}

async function getTeams(groups: SlqneGroupId[]): Promise<TeamWithProgram[]> {
  const batches = await Promise.all(
    programsForGroups(groups).map((program) =>
      getProgramTeams(program).catch(() => [] as TeamWithProgram[]),
    ),
  );
  return batches.flat();
}

export async function getSlqneGames(groups: SlqneGroupId[], range: GameRange): Promise<GameDto[]> {
  const teams = await getTeams(groups);
  const ids = teams.map(({ team }) => team.id);
  const { from, to } = rangeToDates(range);
  const games = await getRegularSeasonGamesForTeams(ids, from, to, new Set(ids));
  return sortGamesByStart(games, range);
}

export async function getSlqneTeamRows(groups: SlqneGroupId[]): Promise<SlqneTeamRowDto[]> {
  const teams = await getTeams(groups);
  if (!teams.length) return [];

  const ids = teams.map(({ team }) => team.id);
  const today = todayInMontreal();

  const [members, history] = await Promise.all([
    spordle<Member[]>("/sp/members", {
      where: { teamId: { inq: ids } },
      include: ["participant"],
    }).catch(() => [] as Member[]),
    getRegularSeasonGamesForTeams(ids, shiftDate(today, -HISTORY_DAYS), today, new Set(ids)).catch(
      () => [] as GameDto[],
    ),
  ]);

  // Each team's league is the one its most recent regular-season game belongs to.
  const scheduleByTeam = new Map<number, number>();
  for (const game of history) {
    if (!game.scheduleId) continue;
    for (const side of [game.home.id, game.away.id]) {
      if (ids.includes(side)) scheduleByTeam.set(side, game.scheduleId);
    }
  }

  const standingsBySchedule = new Map<number, Standing[]>();
  await Promise.all(
    [...new Set(scheduleByTeam.values())].map(async (scheduleId) => {
      const rows = await spordle<Standing[]>(`/sp/schedules/${scheduleId}/teamStats`, {
        where: { team: { name: { neq: "TBA" } } },
        include: ["team"],
      }).catch(() => [] as Standing[]);
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

  return teams.map(({ team, program }) => {
    const category = formatCategory(team.category);
    const scheduleId = scheduleByTeam.get(team.id);
    const rows = scheduleId ? (standingsBySchedule.get(scheduleId) ?? []) : [];
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
      url: slqneTeamUrl(program, team.id),
      programId: program.id,
      programLabel: program.label,
      group: program.group,
    };
  });
}
