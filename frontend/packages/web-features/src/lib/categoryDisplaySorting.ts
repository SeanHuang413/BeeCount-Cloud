import type { WorkspaceCategory } from '@beecount/api-client'

export function compareCategoriesForDisplay(
  a: WorkspaceCategory,
  b: WorkspaceCategory,
  countById: Record<string, number>,
  amountById: Record<string, number>,
): number {
  const aManual = a.sort_order != null
  const bManual = b.sort_order != null

  if (aManual !== bManual) return aManual ? -1 : 1
  if (aManual && bManual && a.sort_order !== b.sort_order) {
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  }

  const countDiff = (countById[b.id] ?? 0) - (countById[a.id] ?? 0)
  if (countDiff) return countDiff

  const amountDiff = (amountById[b.id] ?? 0) - (amountById[a.id] ?? 0)
  if (amountDiff) return amountDiff

  return a.name.localeCompare(b.name)
}
