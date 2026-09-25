import { NextResponse } from "next/server";
import { getAslTeamRows } from "@/lib/asl";

export async function GET() {
  try {
    const teams = await getAslTeamRows();
    return NextResponse.json({ teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
