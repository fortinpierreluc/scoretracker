export const followedArenas = [
  {
    id: "marcel-bedard",
    label: "Marcel-Bédard",
    likes: ["%Marcel-Bédard%", "%Marcel-Bedard%", "%Marcel Bédard%", "%Marcel Bedard%"],
    needles: ["marcel-bedard", "marcel bedard"],
  },
  {
    id: "marc-simoneau",
    label: "Marc-Simoneau",
    hint: "Glaces 1 et 2",
    likes: ["%Simoneau%"],
    needles: ["simoneau"],
  },
  {
    id: "arpidrome",
    label: "Arpidrome",
    likes: ["%Arpidrome%", "%Arpidrôme%"],
    needles: ["arpidrome"],
  },
  {
    id: "les-3-glaces",
    label: "Les 3-Glaces",
    hint: "Toutes les glaces",
    likes: ["%3 Glaces%", "%3-Glaces%", "%3Glaces%"],
    needles: ["3-glaces", "3 glaces", "3glaces"],
  },
  {
    id: "boischatel",
    label: "Boischatel",
    likes: ["%Boischatel%"],
    needles: ["boischatel"],
  },
] as const;

export type ArenaId = (typeof followedArenas)[number]["id"];
export type FollowedArena = (typeof followedArenas)[number];

export function isArenaId(value: string): value is ArenaId {
  return followedArenas.some((arena) => arena.id === value);
}

export function getFollowedArena(id: ArenaId): FollowedArena {
  const arena = followedArenas.find((item) => item.id === id);
  if (!arena) throw new Error(`Aréna inconnue: ${id}`);
  return arena;
}

export function normalizeArenaName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchesFollowedArena(venueName: string | null | undefined, arena: FollowedArena) {
  if (!venueName) return false;
  const normalized = normalizeArenaName(venueName);
  return arena.needles.some((needle) => normalized.includes(needle));
}
