import { NextResponse } from "next/server";
import { getFollowedTeamSummaries } from "@/lib/tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teams = await getFollowedTeamSummaries();
    return NextResponse.json({ teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
