import type { WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'
import { categoryParent } from '../../lib/categoryHierarchy'

export type CategoryStructureRow = {
  id: string
  name: string
  count: number
  expense: number
  children: Array<{ id: string; name: string; count: number; expense: number }>
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
  const expenses = categories.filter((category) => category.kind === 'expense')
  const byId = new Map(expenses.map((category) => [category.id, category]))
  const byName = new Map<string, WorkspaceCategory[]>()
  for (const category of expenses) { const group = byName.get(category.name) ?? []; group.push(category); byName.set(category.name, group) }
  const rows = new Map<string, CategoryStructureRow>()
  const childRows = new Map<string, Map<string, { id: string; name: string; count: number; expense: number }>>()

  for (const tx of transactions) {
    if (tx.tx_type !== 'expense' || tx.exclude_from_stats || amountOf(tx) <= 0) continue
    const named = byName.get(tx.category_name?.trim() || '')
    const resolved = tx.category_id ? byId.get(tx.category_id) : named?.length === 1 ? named[0] : undefined
    const category = resolved?.name || tx.category_name?.trim() || '未分类支出'
    const parent = resolved && resolved.level !== 1 ? categoryParent(resolved, expenses) : undefined
    const id = parent?.id || resolved?.id || (tx.category_id ? `missing:${tx.category_id}` : `name:${category}`)
    const name = parent?.name || category
    const row = rows.get(id) || { id, name, count: 0, expense: 0, children: [], categoryNames: [] }
    const amount = amountOf(tx)
    row.count += 1
    row.expense += amount
    if (!row.categoryNames.includes(category)) row.categoryNames.push(category)
    rows.set(id, row)

    if (parent && resolved) {
      const children = childRows.get(id) || new Map()
      const child = children.get(resolved.id) || { id: resolved.id, name: category, count: 0, expense: 0 }
      child.count += 1
      child.expense += amount
      children.set(resolved.id, child)
      childRows.set(id, children)
    }
  }

  return [...rows.values()]
    .map((row) => ({ ...row, children: [...(childRows.get(row.id)?.values() || [])].sort((a, b) => b.expense - a.expense) }))
    .sort((a, b) => b.expense - a.expense)
}
