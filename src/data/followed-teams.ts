export type SpordleTeamConfig = {
  source: "spordle";
  id: number;
  officeId: number;
  nickname: string;
  url: string;
};

export type KreezeeTeamConfig = {
  source: "kreezee";
  id: number;
  solutionId: number;
  nickname: string;
  shortName: string;
  category: string;
  logoUrl: string;
  url: string;
};

export type HockeyTechTeamConfig = {
  source: "hockeytech";
  id: number;
  clientCode: "lhjmq";
  nickname: string;
  shortName: string;
  category: string;
  logoUrl: string;
  url: string;
};

export type FollowedTeamConfig = SpordleTeamConfig | KreezeeTeamConfig | HockeyTechTeamConfig;

export const followedTeams: FollowedTeamConfig[] = [
  {
    source: "spordle",
    id: 180150,
    officeId: 9209,
    nickname: "Dragons du Collège Laflèche",
    url: "https://collegial.rseqhockey.com/fr/teams/180150?tab=schedule",
  },
  {
    source: "spordle",
    id: 180101,
    officeId: 9209,
    nickname: "Titans de Limoilou",
    url: "https://collegial.rseqhockey.com/fr/teams/180101?tab=schedule",
  },
  {
    source: "spordle",
    id: 179740,
    officeId: 6241,
    nickname: "Arsenal de l'Académie Saint-Louis",
    url: "https://scolaire.rseqhockey.com/fr/teams/179740?tab=schedule",
  },
  {
    source: "spordle",
    id: 179742,
    officeId: 6241,
    nickname: "Arsenal de l'Académie Saint-Louis",
    url: "https://scolaire.rseqhockey.com/fr/teams/179742?tab=schedule",
  },
  {
    source: "kreezee",
    id: 151217,
    solutionId: 23819,
    nickname: "Harfangs de Beauport",
    shortName: "HARFANGS",
    category: "Senior AA",
    logoUrl: "https://cache.kreezee.com/images/teams/ff436584.png",
    url: "https://www.lhsaaq.com/equipes/harfangs-de-beauport-151217",
  },
  {
    source: "hockeytech",
    id: 9,
    clientCode: "lhjmq",
    nickname: "Remparts de Québec",
    shortName: "REMPARTS",
    category: "LHJMQ",
    logoUrl: "https://assets.leaguestat.com/lhjmq/logos/9.png",
    url: "https://chl.ca/lhjmq-remparts/schedule/9/214/?view=grid",
  },
];
