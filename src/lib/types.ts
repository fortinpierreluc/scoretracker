export type GameRange = "today" | "past7" | "next7";

export type GameSource = "spordle" | "lhjmq" | "lhsaaq";

export type TeamSide = {
  id: number;
  name: string;
  shortName: string;
  logoUrl: string | null;
  isFollowed: boolean;
};

export type GameDto = {
  id: number;
  number: string;
  date: string;
  startTime: string;
  status: "upcoming" | "live" | "final";
  periodLabel: string | null;
  clock: string | null;
  arena: string;
  city: string;
  category: string;
  scheduleName: string;
  home: TeamSide;
  away: TeamSide;
  homeScore: number | null;
  awayScore: number | null;
  source: GameSource;
};

export type GoalEventDto = {
  teamName: string;
  logoUrl: string | null;
  scorer: string;
  assists: string[];
  time: string;
  period: string;
  side: "home" | "away";
};

export type FollowedTeamDto = {
  id: number;
  name: string;
  shortName: string;
  nickname: string;
  logoUrl: string | null;
  category: string;
  scheduleId: number | null;
  scheduleName: string | null;
  record: string;
  ranking: number | null;
  points: number | null;
  url: string;
};

export type StandingRowDto = {
  teamId: number;
  ranking: number;
  name: string;
  shortName: string;
  logoUrl: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otl: number;
  points: number;
  goalFor: number;
  goalAgainst: number;
  diff: number;
  isFollowed: boolean;
};

export type StandingsDto = {
  scheduleId: number;
  scheduleName: string;
  category: string;
  rows: StandingRowDto[];
};

export type LastFiveResult = "V" | "D" | "N" | "DP";

export type AslTeamRowDto = {
  id: number;
  name: string;
  shortName: string;
  logoUrl: string | null;
  category: string;
  coach: string | null;
  record: string;
  ranking: number | null;
  teamCount: number | null;
  lastFive: LastFiveResult[];
  url: string;
};
