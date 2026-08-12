import type { WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'

export type CategoryStructureRow = {
  name: string
  count: number
  expense: number
  children: Array<{ name: string; count: number; expense: number }>
  categoryNames: string[]
}

function amountOf(tx: WorkspaceTransaction): number {
  const amount = Number(tx.native_amount ?? tx.amount)
  return Number.isFinite(amount) ? Math.abs(amount) : 0
}

/** Aggregates read-only expense data under official parent categories. */
export function analyzeCategoryStructure(
  transactions: WorkspaceTransaction[],
  categories: WorkspaceCategory[],
): CategoryStructureRow[] {
  const parentByChild = new Map(
    categories
      .filter((category) => category.kind === 'expense' && category.parent_name)
      .map((category) => [category.name, category.parent_name as string]),
  )
  const rows = new Map<string, CategoryStructureRow>()
  const childRows = new Map<string, Map<string, { name: string; count: number; expense: number }>>()

  for (const tx of transactions) {
    if (tx.tx_type !== 'expense' || tx.exclude_from_stats || amountOf(tx) <= 0) continue
    const category = tx.category_name?.trim() || '未分类支出'
    const parent = parentByChild.get(category) || category
    const row = rows.get(parent) || { name: parent, count: 0, expense: 0, children: [], categoryNames: [] }
    const amount = amountOf(tx)
    row.count += 1
    row.expense += amount
    if (!row.categoryNames.includes(category)) row.categoryNames.push(category)
    rows.set(parent, row)

    if (category !== parent) {
      const children = childRows.get(parent) || new Map()
      const child = children.get(category) || { name: category, count: 0, expense: 0 }
      child.count += 1
      child.expense += amount
      children.set(category, child)
      childRows.set(parent, children)
    }
  }

  return [...rows.values()]
    .map((row) => ({ ...row, children: [...(childRows.get(row.name)?.values() || [])].sort((a, b) => b.expense - a.expense) }))
    .sort((a, b) => b.expense - a.expense)
}
