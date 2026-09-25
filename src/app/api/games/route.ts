import { NextResponse } from "next/server";
import { getArenaGames, getGames, isArenaId } from "@/lib/tracker";
import type { GameRange } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") ?? "today") as GameRange;
  const arena = searchParams.get("arena");
  const allowed: GameRange[] = ["today", "past7", "next7"];

  if (!allowed.includes(range)) {
    return NextResponse.json({ error: "Plage invalide" }, { status: 400 });
  }

  if (arena) {
    if (!isArenaId(arena)) {
      return NextResponse.json({ error: "Aréna invalide" }, { status: 400 });
    }
    try {
      const games = await getArenaGames(arena, range);
      return NextResponse.json({ games });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  try {
    const games = await getGames(range);
    return NextResponse.json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
