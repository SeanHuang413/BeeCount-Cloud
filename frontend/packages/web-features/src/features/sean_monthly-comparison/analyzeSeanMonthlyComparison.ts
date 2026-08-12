import type { WorkspaceTransaction } from '@beecount/api-client'

export type SeanMonthlyComparisonRow = {
  month: string
  income: number
  expense: number
  balance: number
  count: number
  incomeChange: number | null
  expenseChange: number | null
  isCurrentMonth: boolean
}

function amountOf(tx: WorkspaceTransaction): number {
  const value = Number(tx.native_amount ?? tx.amount)
  return Number.isFinite(value) ? Math.abs(value) : 0
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Creates twelve comparable natural-month buckets; transfers and excluded records are deliberately omitted. */
export function analyzeSeanMonthlyComparison(
  transactions: WorkspaceTransaction[],
  now = new Date(),
): SeanMonthlyComparisonRow[] {
  const current = new Date(now.getFullYear(), now.getMonth(), 1)
  const rows = new Map<string, SeanMonthlyComparisonRow>()
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(current.getFullYear(), current.getMonth() - offset, 1)
    const key = monthKey(date)
    rows.set(key, { month: key, income: 0, expense: 0, balance: 0, count: 0, incomeChange: null, expenseChange: null, isCurrentMonth: offset === 0 })
  }
  for (const tx of transactions) {
    if ((tx.tx_type !== 'income' && tx.tx_type !== 'expense') || tx.exclude_from_stats) continue
    const happenedAt = new Date(tx.happened_at)
    if (!Number.isFinite(happenedAt.getTime())) continue
    const row = rows.get(monthKey(happenedAt))
    const amount = amountOf(tx)
    if (!row || amount <= 0) continue
    row.count += 1
    if (tx.tx_type === 'income') row.income += amount
    else row.expense += amount
    row.balance = row.income - row.expense
  }
  const ordered = [...rows.values()]
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const row = ordered[index]
    row.incomeChange = previous.income > 0 ? (row.income - previous.income) / previous.income : null
    row.expenseChange = previous.expense > 0 ? (row.expense - previous.expense) / previous.expense : null
  }
  return ordered
}
