import { DEFAULT_SLQNE_GROUPS, isSlqneGroupId } from "@/data/slqne";
import type { SlqneGroupId } from "@/data/slqne";

export function parseGroups(searchParams: URLSearchParams): SlqneGroupId[] {
  const raw = searchParams.get("groups");
  if (raw === null) return DEFAULT_SLQNE_GROUPS;
  return raw.split(",").filter(isSlqneGroupId);
}
