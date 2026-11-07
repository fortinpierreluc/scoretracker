import { NextResponse } from "next/server";
import { getSlqneTeamRows } from "@/lib/slqne";
import { parseGroups } from "../params";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const teams = await getSlqneTeamRows(parseGroups(searchParams));
    return NextResponse.json({ teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
