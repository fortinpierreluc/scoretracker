import { NextResponse } from "next/server";
import { getAslGames } from "@/lib/asl";
import type { GameRange } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") ?? "today") as GameRange;
  const allowed: GameRange[] = ["today", "past7", "next7"];

  if (!allowed.includes(range)) {
    return NextResponse.json({ error: "Plage invalide" }, { status: 400 });
  }

  try {
    const games = await getAslGames(range);
    return NextResponse.json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
