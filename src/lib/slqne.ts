import {
  matchesProgram,
  programsForGroups,
  SLQNE_SEASON_OFFICE_ID,
  slqneTeamUrl,
} from "@/data/slqne";
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

type SpordleCategory = NonNullable<Parameters<typeof formatCategory>[0]>;

type SpordleTeam = {
  id: number;
  name: string;
  shortName: string;
  logoUrl?: string | null;
  seasonId?: string;
  category?: SpordleCategory;
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

async function getProgramTeams(program: SlqneProgram, seasonId: string): Promise<TeamWithProgram[]> {
  const teams = await spordle<SpordleTeam[]>("/sp/teams", {
    where: {
      and: [
        { seasonId },
        {
          or: program.likes.flatMap((like) => [{ name: { like } }, { shortName: { like } }]),
        },
      ],
    },
    include: ["category"],
  });

  const unique = new Map<number, SpordleTeam>();
  for (const team of teams) {
    if (team.seasonId && team.seasonId !== seasonId) continue;
    if (!matchesProgram(program, team.name, team.shortName)) continue;
    unique.set(team.id, team);
  }

  return [...unique.values()].sort(compareTeams).map((team) => ({ team, program }));
}

async function getTeams(groups: SlqneGroupId[]): Promise<TeamWithProgram[]> {
  const programs = programsForGroups(groups);
  if (!programs.length) return [];

  const seasonId = await currentSeasonId(SLQNE_SEASON_OFFICE_ID);
  const results = await Promise.allSettled(
    programs.map((program) => getProgramTeams(program, seasonId)),
  );

  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length === results.length) {
    const reason = (failures[0] as PromiseRejectedResult).reason;
    throw reason instanceof Error ? reason : new Error("Recherche des équipes impossible");
  }

  const seen = new Set<number>();
  const teams: TeamWithProgram[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const entry of result.value) {
      if (seen.has(entry.team.id)) continue;
      seen.add(entry.team.id);
      teams.push(entry);
    }
  }
  return teams;
}

function programHeading(program: SlqneProgram, category?: SpordleCategory) {
  if (!program.splitByGender) return { id: program.id, label: program.label };
  if (category?.gender === "Female") {
    return { id: `${program.id}-feminin`, label: `${program.label} — Féminin` };
  }
  return { id: `${program.id}-masculin`, label: `${program.label} — Masculin` };
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

  const rows = teams.map(({ team, program }) => {
    const heading = programHeading(program, team.category);
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
      programId: heading.id,
      programLabel: heading.label,
      group: program.group,
    };
  });

  // Regroupe les équipes d'un même titre (ex. As de Québec — Féminin) l'une après l'autre.
  const order = new Map<string, number>();
  for (const row of rows) if (!order.has(row.programId)) order.set(row.programId, order.size);
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => order.get(a.row.programId)! - order.get(b.row.programId)! || a.index - b.index)
    .map(({ row }) => row);
}
