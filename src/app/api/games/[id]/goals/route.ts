import { NextResponse } from "next/server";
import { getGameGoals } from "@/lib/goals";
import type { GameSource } from "@/lib/types";

const sources: GameSource[] = ["spordle", "lhjmq", "lhsaaq"];

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const gameId = Number(id);
  const source = new URL(request.url).searchParams.get("source");

  if (!Number.isInteger(gameId) || gameId <= 0 || !sources.includes(source as GameSource)) {
    return NextResponse.json({ error: "Match invalide" }, { status: 400 });
  }

  try {
    const goals = await getGameGoals(source as GameSource, gameId);
    return NextResponse.json({ goals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
