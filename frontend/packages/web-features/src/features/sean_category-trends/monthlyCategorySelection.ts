import type { WorkspaceCategory } from '@beecount/api-client'
import { categoryParent } from '../../lib/categoryHierarchy'
import type { CategoryTrend } from './analyzeCategoryTrends'

export function monthlyCategoryChildren(categories: WorkspaceCategory[], parentId: string) {
  const expenses = categories.filter(row => row.kind === 'expense')
  return expenses.filter(row => row.level === 2 && categoryParent(row, expenses)?.id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function selectMonthlyCategoryRows(rows: CategoryTrend[], parents: CategoryTrend[], leaves: CategoryTrend[], parentId: string, childId: string) {
  if (parentId === '__all' || !parents.some(row => row.id === parentId && row.total > 0)) return rows
  if (childId === '__all') return parents.filter(row => row.id === parentId)
  return leaves.filter(row => row.id === (childId === '__direct' ? parentId : childId))
}
