import type { ReadTag } from '@beecount/api-client'

type TagStats = { count: number; expense: number; income: number }

export function compareTagsForDisplay(
  a: ReadTag,
  b: ReadTag,
  statsById: Record<string, TagStats>,
): number {
  const aStats = statsById[a.id]
  const bStats = statsById[b.id]
  return (bStats?.count ?? 0) - (aStats?.count ?? 0)
    || (bStats?.expense ?? 0) - (aStats?.expense ?? 0)
    || (bStats?.income ?? 0) - (aStats?.income ?? 0)
    || a.name.localeCompare(b.name)
}
