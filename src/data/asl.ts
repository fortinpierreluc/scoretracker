export const ASL_CLUB_OFFICE_ID = 6377;
export const ASL_LEAGUE_OFFICE_ID = 6241;
export const ASL_SCHEDULE_URL = "https://scolaire.rseqhockey.com/fr/schedule";

export function aslTeamUrl(teamId: number) {
  return `https://scolaire.rseqhockey.com/fr/teams/${teamId}?tab=schedule`;
}
