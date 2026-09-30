import type { PlayerState, BattleAction, HistoryEntry } from "./types.js";
export function archiveEntry(p: PlayerState): HistoryEntry | undefined {
  const history = p.history ?? [];
  const counts = new Map<string, number>();
  for (const h of history)
    if (h.action.action !== "SIGNATURE" && h.action.action !== "STALL")
      counts.set(h.action.action, (counts.get(h.action.action) || 0) + 1);
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if ((counts.get(h.action.action) || 0) < 2) continue;
    const a = h.action.action === "MIRROR" ? h.pattern : h.action;
    if (
      a &&
      a.action !== "SIGNATURE" &&
      a.action !== "MIRROR" &&
      a.action !== "STALL"
    )
      return h;
  }
  return undefined;
}
export function archivePattern(p: PlayerState): BattleAction | undefined {
  const entry = archiveEntry(p);
  if (!entry) return undefined;
  const action =
    entry.action.action === "MIRROR" ? entry.pattern : entry.action;
  return action && action.action !== "STALL" ? { ...action } : undefined;
}
