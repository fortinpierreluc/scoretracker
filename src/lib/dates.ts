import type { GameRange } from "@/lib/types";

export const TIME_ZONE = "America/Toronto";

export function todayInMontreal(base = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

export function shiftDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function inclusiveRange(startOffset: number, dayCount: number) {
  const from = shiftDate(todayInMontreal(), startOffset);
  return { from, to: shiftDate(from, dayCount - 1) };
}

export function rangeToDates(range: GameRange): { from: string; to: string } {
  const today = todayInMontreal();
  if (range === "today") return { from: today, to: today };
  if (range === "past7") return inclusiveRange(-7, 7);
  return inclusiveRange(1, 7);
}

export function sortGamesByStart<T extends { startTime: string }>(games: T[], range: GameRange): T[] {
  const direction = range === "past7" ? -1 : 1;
  return [...games].sort(
    (a, b) => direction * (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  );
}

export function headingForDate(isoDate: string) {
  const today = todayInMontreal();
  const yesterday = shiftDate(today, -1);

  if (isoDate === today) return "Aujourd'hui";
  if (isoDate === yesterday) return "Hier";

  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
