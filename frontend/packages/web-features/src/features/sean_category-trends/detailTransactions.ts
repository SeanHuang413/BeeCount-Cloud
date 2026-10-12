import type { WorkspaceTransaction } from '@beecount/api-client'
import { trendExpenseAmount, trendMonthKey } from './analyzeCategoryTrends'

export function categoryDetailTransactions(items: WorkspaceTransaction[], currency: string, month: string, query: string, sort: 'date' | 'amount') {
  const period = month ? items.filter(tx => trendMonthKey(new Date(tx.happened_at)) === month) : items
  const keyword = query.trim().toLocaleLowerCase()
  const filtered = period.filter(tx => !keyword || (tx.note || '').toLocaleLowerCase().includes(keyword))
    .slice().sort((a, b) => (sort === 'amount' ? (trendExpenseAmount(b, currency) ?? 0) - (trendExpenseAmount(a, currency) ?? 0) : 0)
      || new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime() || a.id.localeCompare(b.id))
  const total = (rows: WorkspaceTransaction[]) => rows.reduce((sum, tx) => sum + (trendExpenseAmount(tx, currency) ?? 0), 0)
  return { period, filtered, periodTotal: total(period), filteredTotal: total(filtered) }
}
