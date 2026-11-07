export const slqneGroups = [
  { id: "aaa", label: "AAA" },
  { id: "scolaire", label: "Scolaire" },
  { id: "hqne", label: "HQNE" },
] as const;

export type SlqneGroupId = (typeof slqneGroups)[number]["id"];

export const DEFAULT_SLQNE_GROUPS: SlqneGroupId[] = ["aaa", "scolaire"];

export function isSlqneGroupId(value: string): value is SlqneGroupId {
  return slqneGroups.some((group) => group.id === value);
}

export type SlqneProgram = {
  id: string;
  group: SlqneGroupId;
  label: string;
  /** Spordle office of the club or school: every team it registers this season is listed. */
  officeId: number;
  /** Public Spordle site used to build team links. */
  siteUrl: string;
};

export const slqnePrograms: SlqneProgram[] = [
  {
    id: "as-quebec-masculin",
    group: "aaa",
    label: "As de Québec — Masculin",
    officeId: 0,
    siteUrl: "https://masculin.lheq.ca",
  },
  {
    id: "as-quebec-feminin",
    group: "aaa",
    label: "As de Québec — Féminin",
    officeId: 0,
    siteUrl: "https://feminin.lheq.ca",
  },
  {
    id: "cardinal-roy",
    group: "scolaire",
    label: "École Cardinal-Roy",
    officeId: 0,
    siteUrl: "https://scolaire.rseqhockey.com",
  },
  {
    id: "mont-sainte-anne",
    group: "scolaire",
    label: "École secondaire du Mont-Sainte-Anne",
    officeId: 0,
    siteUrl: "https://scolaire.rseqhockey.com",
  },
  {
    id: "seigneurie",
    group: "scolaire",
    label: "École secondaire de la Seigneurie",
    officeId: 0,
    siteUrl: "https://scolaire.rseqhockey.com",
  },
];

export function programsForGroups(groups: SlqneGroupId[]) {
  return slqnePrograms.filter((program) => groups.includes(program.group) && program.officeId > 0);
}

export function slqneTeamUrl(program: SlqneProgram, teamId: number) {
  return `${program.siteUrl}/fr/teams/${teamId}?tab=schedule`;
}
