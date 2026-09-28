import {
  getLhjmqGames,
  getLhjmqStandings,
  getLhjmqStandingsOptions,
  getLhjmqTeamSummaries,
  isLhjmqSchedule,
} from "@/lib/lhjmq";
import { getFollowedArena, isArenaId } from "@/data/followed-arenas";
import type { ArenaId } from "@/data/followed-arenas";
import {
  getLhsaaqArenaGames,
  getLhsaaqGames,
  getLhsaaqStandings,
  getLhsaaqStandingsOptions,
  getLhsaaqTeamSummaries,
  isLhsaaqSchedule,
} from "@/lib/lhsaaq";
import {
  getSpordleArenaGames,
  getSpordleGames,
  getSpordleStandings,
  getSpordleStandingsOptions,
  getSpordleTeamSummaries,
} from "@/lib/spordle";
import { sortGamesByStart } from "@/lib/dates";
import { getAslGames, getAslTeamRows } from "@/lib/asl";
import type { AslTeamRowDto, FollowedTeamDto, GameDto, GameRange, StandingsDto } from "@/lib/types";

export async function getGames(range: GameRange): Promise<GameDto[]> {
  const [spordle, lhsaaq, lhjmq] = await Promise.all([
    getSpordleGames(range),
    getLhsaaqGames(range).catch(() => [] as GameDto[]),
    getLhjmqGames(range).catch(() => [] as GameDto[]),
  ]);

  return sortGamesByStart([...spordle, ...lhsaaq, ...lhjmq], range);
}

export { isArenaId };

export async function getArenaGames(arenaId: ArenaId, range: GameRange): Promise<GameDto[]> {
  const arena = getFollowedArena(arenaId);
  const [spordle, lhsaaq] = await Promise.all([
    getSpordleArenaGames(arenaId, range),
    getLhsaaqArenaGames(arena, range).catch(() => [] as GameDto[]),
  ]);

  const unique = new Map<string, GameDto>();
  for (const game of [...spordle, ...lhsaaq]) {
    unique.set(`${game.date}-${game.startTime}-${game.home.id}-${game.away.id}`, game);
  }

  return sortGamesByStart([...unique.values()], range);
}

export async function getFollowedTeamSummaries(): Promise<FollowedTeamDto[]> {
  const [spordle, lhsaaq, lhjmq] = await Promise.all([
    getSpordleTeamSummaries(),
    getLhsaaqTeamSummaries().catch(() => [] as FollowedTeamDto[]),
    getLhjmqTeamSummaries().catch(() => [] as FollowedTeamDto[]),
  ]);
  return [...spordle, ...lhsaaq, ...lhjmq];
}

export async function getStandingsOptions(): Promise<
  Array<{ scheduleId: number; scheduleName: string; category: string }>
> {
  const [spordle, lhsaaq, lhjmq] = await Promise.all([
    getSpordleStandingsOptions(),
    getLhsaaqStandingsOptions().catch(() => []),
    getLhjmqStandingsOptions().catch(() => []),
  ]);
  return [...spordle, ...lhsaaq, ...lhjmq];
}

export { getAslGames, getAslTeamRows };
export type { AslTeamRowDto };

export async function getStandings(scheduleId: number): Promise<StandingsDto> {
  if (await isLhsaaqSchedule(scheduleId)) {
    return getLhsaaqStandings(scheduleId);
  }
  if (await isLhjmqSchedule(scheduleId)) {
    return getLhjmqStandings(scheduleId);
  }
  return getSpordleStandings(scheduleId);
}
