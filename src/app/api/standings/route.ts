import { NextResponse } from "next/server";
import { getStandings, getStandingsOptions } from "@/lib/tracker";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheduleIdParam = searchParams.get("scheduleId");

  try {
    const options = await getStandingsOptions();
    const scheduleId = scheduleIdParam ? Number(scheduleIdParam) : null;

    if (!scheduleId) {
      return NextResponse.json({ options, standings: null });
    }

    const standings = await getStandings(scheduleId);
    return NextResponse.json({ options, standings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
