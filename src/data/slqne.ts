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

/** Bureau RSEQ scolaire (déjà utilisé pour l'ASL) : sert à connaître la saison en cours. */
export const SLQNE_SEASON_OFFICE_ID = 6241;

export type SlqneProgram = {
  id: string;
  group: SlqneGroupId;
  label: string;
  /**
   * Motifs SQL « like » envoyés à Spordle sur le nom et le nom court des équipes.
   * Spordle distingue les majuscules : on donne donc les variantes d'écriture.
   */
  likes: string[];
  /** Vérification finale sur le nom normalisé (sans accents, en minuscules). */
  needles: RegExp[];
  /** Équipes à écarter même si leur nom correspond (sur le nom normalisé). */
  excludes?: RegExp[];
  /** Sépare les équipes masculines et féminines sous deux titres. */
  splitByGender?: boolean;
  /** Site public Spordle utilisé pour les liens vers les équipes. */
  siteUrl: string;
};

export const slqnePrograms: SlqneProgram[] = [
  {
    id: "as-quebec",
    group: "aaa",
    label: "As de Québec",
    likes: [
      "%As de Québec%",
      "%As de Quebec%",
      "%AS DE QUÉBEC%",
      "%AS DE QUEBEC%",
      "%As Québec%",
      "%As Quebec%",
      "%AS QUÉBEC%",
      "%AS QUEBEC%",
      "%Québec As%",
      "%QUÉBEC AS%",
    ],
    needles: [/\bas (de )?quebec\b/, /\bquebec as\b/],
    splitByGender: true,
    siteUrl: "https://page.spordle.com/fr/ligue-de-hockey-d-excellence-du-quebec-masculin",
  },
  {
    id: "cardinal-roy",
    group: "scolaire",
    label: "École Cardinal-Roy",
    likes: ["%Cardinal%Roy%", "%CARDINAL%ROY%", "%Cardinal%ROY%", "%cardinal%roy%"],
    needles: [/cardinal\W*roy/],
    siteUrl: "https://scolaire.rseqhockey.com/fr",
  },
  {
    id: "mont-sainte-anne",
    group: "scolaire",
    label: "École secondaire du Mont-Sainte-Anne",
    likes: [
      "%Mont-Sainte-Anne%",
      "%Mont Sainte-Anne%",
      "%Mont-Ste-Anne%",
      "%MONT-SAINTE-ANNE%",
      "%MONT SAINTE-ANNE%",
      "%MONT-STE-ANNE%",
    ],
    needles: [/mont[- ]s(ain)?te[- ]anne/],
    // Le Collège du Mont-Sainte-Anne n'est pas suivi : seulement les Vikings de l'ESMSA.
    excludes: [/college/, /\bcollegial\b/],
    siteUrl: "https://scolaire.rseqhockey.com/fr",
  },
  {
    id: "seigneurie",
    group: "scolaire",
    label: "École secondaire de la Seigneurie",
    likes: ["%Seigneurie%", "%SEIGNEURIE%", "%seigneurie%"],
    needles: [/seigneurie/],
    siteUrl: "https://scolaire.rseqhockey.com/fr",
  },
  {
    id: "hqne",
    group: "hqne",
    label: "Équipes HQNE",
    likes: ["%HQNE%"],
    needles: [/\bhqne\b/],
    siteUrl: "https://page.spordle.com/fr/lhqca",
  },
];

export function programsForGroups(groups: SlqneGroupId[]) {
  return slqnePrograms.filter((program) => groups.includes(program.group));
}

export function normalizeTeamName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function matchesProgram(program: SlqneProgram, ...names: Array<string | null | undefined>) {
  return names.some((name) => {
    if (!name) return false;
    const normalized = normalizeTeamName(name);
    return program.needles.some((needle) => needle.test(normalized));
  }) && !names.some((name) => {
    if (!name || !program.excludes) return false;
    const normalized = normalizeTeamName(name);
    return program.excludes.some((exclude) => exclude.test(normalized));
  });
}

export function slqneTeamUrl(program: SlqneProgram, teamId: number) {
  return `${program.siteUrl}/teams/${teamId}?tab=schedule`;
}
