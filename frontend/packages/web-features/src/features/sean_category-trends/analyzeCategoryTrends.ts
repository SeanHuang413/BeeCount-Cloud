import type { WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'
import { categoryParent } from '../../lib/categoryHierarchy'

export type TrendBucket = { month: string; amount: number; count: number; average: number; monthDelta: number }
export type CategoryTrend = {
  id: string
  name: string
  months: TrendBucket[]
  baseline: TrendBucket
  total: number
  current: TrendBucket
  previous: TrendBucket
  delta: number
  change: number | null
  currentItems: WorkspaceTransaction[]
  previousItems: WorkspaceTransaction[]
  items: WorkspaceTransaction[]
}
export type CategoryTrendOptions = {
  currency: string
  months: 3 | 6 | 12
  level: 'parent' | 'leaf'
  comparisonMonth: string
  samePeriod: boolean
  now?: Date
}

export function trendMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function bucket(month: string): TrendBucket { return { month, amount: 0, count: 0, average: 0, monthDelta: 0 } }
function add(row: TrendBucket, amount: number) {
  row.amount += amount
  row.count += 1
  row.average = row.amount / row.count
}

/** Uses the saved ledger-currency snapshot; missing foreign-currency snapshots are omitted. */
export function trendExpenseAmount(tx: WorkspaceTransaction, currency: string): number | null {
  if (tx.native_amount == null && (tx.currency_code || currency).toUpperCase() !== currency.toUpperCase()) return null
  const value = Number(tx.native_amount ?? tx.amount)
  return Number.isFinite(value) && value !== 0 ? Math.abs(value) : null
}

export function analyzeCategoryTrends(
  transactions: WorkspaceTransaction[], categories: WorkspaceCategory[], options: CategoryTrendOptions,
) {
  const now = options.now ?? new Date()
  const monthKeys = Array.from({ length: options.months }, (_, index) =>
    trendMonthKey(new Date(now.getFullYear(), now.getMonth() - options.months + 1 + index, 1)),
  )
  const comparisonMonth = monthKeys.includes(options.comparisonMonth) ? options.comparisonMonth : trendMonthKey(now)
  const [year, month] = comparisonMonth.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const previousStart = new Date(year, month - 2, 1)
  const end = new Date(year, month, 1)
  const currentPartial = comparisonMonth === trendMonthKey(now)
  const samePeriod = currentPartial && options.samePeriod
  const previousLastDay = new Date(year, month - 1, 0).getDate()
  const previousEnd = samePeriod && now.getDate() <= previousLastDay
    ? new Date(year, month - 2, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
    : start
  const expenses = categories.filter((category) => category.kind === 'expense')
  const byId = new Map(expenses.map((category) => [category.id, category]))
  const byName = new Map<string, WorkspaceCategory[]>()
  for (const category of expenses) {
    const name = category.name.trim()
    byName.set(name, [...(byName.get(name) ?? []), category])
  }
  const groups = new Map<string, { id: string; name: string }>()
  for (const category of expenses) {
    const parent = category.level === 2 ? categoryParent(category, expenses) : undefined
    groups.set(category.id, options.level === 'parent' && parent
      ? { id: parent.id, name: parent.name }
      : { id: category.id, name: parent ? `${parent.name} / ${category.name}` : category.name })
  }
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - options.months, 1)
  const baselineMonth = trendMonthKey(rangeStart)
  const create = (id: string, name: string): CategoryTrend => ({
    id, name, months: monthKeys.map(bucket), total: 0,
    baseline: bucket(baselineMonth),
    current: bucket(comparisonMonth), previous: bucket(trendMonthKey(previousStart)),
    delta: 0, change: null, currentItems: [], previousItems: [], items: [],
  })
  const all = create('__all', '全部分类')
  const rows = new Map<string, CategoryTrend>()
  const ignoredCurrencies = new Set<string>()
  let ignoredCount = 0
  for (const tx of transactions) {
    if (tx.tx_type !== 'expense' || tx.exclude_from_stats) continue
    const date = new Date(tx.happened_at)
    if (!Number.isFinite(date.getTime()) || date < rangeStart || date > now) continue
    const key = trendMonthKey(date)
    const index = monthKeys.indexOf(key)
    const inCurrent = date >= start && date < end
    const inPrevious = date >= previousStart && date < previousEnd
    if (index < 0 && !inPrevious && key !== baselineMonth) continue
    const amount = trendExpenseAmount(tx, options.currency)
    if (amount === null) {
      if (tx.native_amount == null && (tx.currency_code || options.currency).toUpperCase() !== options.currency.toUpperCase()) {
        ignoredCurrencies.add((tx.currency_code || '').toUpperCase())
        ignoredCount += 1
      }
      continue
    }
    // A supplied ID is authoritative; only old records without IDs can use an unambiguous name.
    const named = byName.get(tx.category_name?.trim() || '')
    const category = tx.category_id ? byId.get(tx.category_id) : named?.length === 1 ? named[0] : undefined
    const group = category ? groups.get(category.id)! : {
      id: tx.category_id ? `missing:${tx.category_id}` : `name:${tx.category_name?.trim() || ''}`,
      name: tx.category_name?.trim() || '未分类支出',
    }
    const row = rows.get(group.id) ?? create(group.id, group.name)
    rows.set(row.id, row)
    for (const target of [all, row]) {
      if (index >= 0) { add(target.months[index], amount); target.total += amount; target.items.push(tx) }
      if (key === baselineMonth) add(target.baseline, amount)
      if (inCurrent) { add(target.current, amount); target.currentItems.push(tx) }
      if (inPrevious) { add(target.previous, amount); target.previousItems.push(tx) }
    }
  }
  for (const row of [all, ...rows.values()]) {
    for (let index = 0; index < row.months.length; index += 1) {
      const previous = index === 0 ? row.baseline : row.months[index - 1]
      row.months[index].monthDelta = Math.round((row.months[index].amount - previous.amount) * 100) / 100
    }
    row.delta = row.current.amount - row.previous.amount
    row.change = row.previous.amount > 0 ? row.delta / row.previous.amount : null
  }
  return { all, rows: [...rows.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    monthKeys, comparisonMonth, currentPartial, samePeriod, ignoredCurrencies: [...ignoredCurrencies].sort(), ignoredCount }
}
