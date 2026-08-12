import type { WorkspaceTransaction } from '@beecount/api-client'

export type SeanReportRow = { name: string; count: number; expense: number; income: number; balance: number }
export type SeanLargeExpense = WorkspaceTransaction & { reportAmount: number }
export type SeanWeeklyCashflow = { weekStart: string; income: number; expense: number; balance: number; count: number }

export type SeanReportData = {
  tags: SeanReportRow[]
  repeatMerchants: SeanReportRow[]
  incomeSources: SeanReportRow[]
  largeExpenses: SeanLargeExpense[]
  largeExpenseThreshold: number
  weeks: SeanWeeklyCashflow[]
}

function amountOf(tx: WorkspaceTransaction): number {
  const amount = Number(tx.native_amount ?? tx.amount)
  return Number.isFinite(amount) ? Math.abs(amount) : 0
}

function tagNames(tx: WorkspaceTransaction): string[] {
  if (tx.tags_list?.length) return tx.tags_list.filter(Boolean)
  return (tx.tags || '').split(',').map((name) => name.trim()).filter(Boolean)
}

function weekStart(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

function addRow(target: Map<string, SeanReportRow>, name: string, tx: WorkspaceTransaction, amount: number): void {
  const row = target.get(name) || { name, count: 0, expense: 0, income: 0, balance: 0 }
  row.count += 1
  if (tx.tx_type === 'expense') row.expense += amount
  if (tx.tx_type === 'income') row.income += amount
  row.balance = row.income - row.expense
  target.set(name, row)
}

/** Read-only report aggregation. Transfers and statistics-excluded records never enter income/expense reports. */
export function analyzeSeanReports(transactions: WorkspaceTransaction[]): SeanReportData {
  const included = transactions.filter((tx) =>
    (tx.tx_type === 'expense' || tx.tx_type === 'income') && !tx.exclude_from_stats && amountOf(tx) > 0,
  )
  const tagRows = new Map<string, SeanReportRow>()
  const merchantRows = new Map<string, SeanReportRow>()
  const incomeRows = new Map<string, SeanReportRow>()
  const weeks = new Map<string, SeanWeeklyCashflow>()

  for (const tx of included) {
    const amount = amountOf(tx)
    for (const tag of tagNames(tx)) addRow(tagRows, tag, tx, amount)
    // 「高频消费」只看支出。收入调整和同名入账不能混进消费判断。
    if (tx.tx_type === 'expense') {
      const merchant = (tx.note || tx.category_name || '').trim()
      if (merchant) addRow(merchantRows, merchant, tx, amount)
    }
    if (tx.tx_type === 'income') {
      const source = (tx.note || tx.category_name || '未命名收入').trim()
      addRow(incomeRows, source, tx, amount)
    }
    const start = weekStart(tx.happened_at)
    if (start) {
      const row = weeks.get(start) || { weekStart: start, income: 0, expense: 0, balance: 0, count: 0 }
      row.count += 1
      if (tx.tx_type === 'income') row.income += amount
      else row.expense += amount
      row.balance = row.income - row.expense
      weeks.set(start, row)
    }
  }

  const expenseAmounts = included.filter((tx) => tx.tx_type === 'expense').map(amountOf).sort((a, b) => a - b)
  const median = expenseAmounts.length ? expenseAmounts[Math.floor(expenseAmounts.length / 2)] : 0
  const largeExpenseThreshold = Math.max(1000, median * 8)
  const largeExpenses = included
    .filter((tx) => tx.tx_type === 'expense' && amountOf(tx) >= largeExpenseThreshold)
    .map((tx) => ({ ...tx, reportAmount: amountOf(tx) }))
    .sort((a, b) => b.reportAmount - a.reportAmount)
    .slice(0, 12)

  return {
    tags: [...tagRows.values()].sort((a, b) => b.expense - a.expense || b.count - a.count).slice(0, 12),
    repeatMerchants: [...merchantRows.values()]
      .filter((row) => row.count >= 3)
      .sort((a, b) => b.count - a.count || b.expense - a.expense)
      .slice(0, 12),
    incomeSources: [...incomeRows.values()]
      .sort((a, b) => b.income - a.income || b.count - a.count)
      .slice(0, 12),
    largeExpenses,
    largeExpenseThreshold,
    weeks: [...weeks.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-8).reverse(),
  }
}
