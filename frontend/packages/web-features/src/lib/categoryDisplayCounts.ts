import type { WorkspaceCategory } from '@beecount/api-client'

type CategoryCountRow = Pick<
  WorkspaceCategory,
  'id' | 'name' | 'kind' | 'parent_name'
>

/**
 * Build counts for category cards without changing the API's direct-count
 * contract. Transactions normally reference a leaf category, so a parent card
 * needs its own direct count plus the direct counts of all matching children.
 */
export function buildCategoryDisplayCounts(
  rows: CategoryCountRow[],
  directCountById: Record<string, number>,
): Record<string, number> {
  const displayCounts: Record<string, number> = {}
  const parentByKindAndName = new Map<string, CategoryCountRow>()

  for (const row of rows) {
    if (!row.id) continue
    displayCounts[row.id] = directCountById[row.id] ?? 0
    if (!(row.parent_name || '').trim()) {
      parentByKindAndName.set(categoryKey(row.kind, row.name), row)
    }
  }

  for (const row of rows) {
    const parentName = (row.parent_name || '').trim()
    if (!row.id || !parentName) continue
    const parent = parentByKindAndName.get(categoryKey(row.kind, parentName))
    if (!parent?.id) continue
    displayCounts[parent.id] = (displayCounts[parent.id] ?? 0) + (directCountById[row.id] ?? 0)
  }

  return displayCounts
}

function categoryKey(kind: string | null | undefined, name: string): string {
  return `${kind || 'expense'}::${name.trim().toLocaleLowerCase()}`
}
