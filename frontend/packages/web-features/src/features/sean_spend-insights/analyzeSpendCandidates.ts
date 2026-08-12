import type { WorkspaceTransaction } from '@beecount/api-client'

export type SeanSpendInsightKind = 'frequent' | 'rising' | 'subscription'

export type SeanSpendInsight = {
  id: string
  kind: SeanSpendInsightKind
  title: string
  currentAmount: number
  previousAmount: number
  transactionCount: number
  detail: string
  query: string
}

export type SeanSpendInsightResult = {
  currentExpense: number
  previousExpense: number
  eligibleTransactionCount: number
  insights: SeanSpendInsight[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function amountOf(tx: WorkspaceTransaction): number {
  const value = tx.native_amount ?? tx.amount
  return Number.isFinite(value) ? Math.abs(value) : 0
}

function normalizedNote(note: string | null): string {
  return (note || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

/**
 * A deliberately conservative, local-only first pass at finding expenses worth
 * reviewing. It never labels a transaction as waste; it only surfaces patterns.
 */
export function analyzeSeanSpendCandidates(
  transactions: WorkspaceTransaction[],
  now = new Date(),
): SeanSpendInsightResult {
  const currentStart = now.getTime() - 90 * DAY_MS
  const previousStart = currentStart - 90 * DAY_MS
  const byCategory = new Map<string, { current: number; previous: number; count: number }>()
  const byNote = new Map<string, { total: number; count: number; amounts: number[]; dates: number[] }>()
  let currentExpense = 0
  let previousExpense = 0
  let eligibleTransactionCount = 0

  for (const tx of transactions) {
    if (tx.tx_type !== 'expense' || tx.exclude_from_stats) continue
    const occurredAt = new Date(tx.happened_at).getTime()
    if (!Number.isFinite(occurredAt) || occurredAt < previousStart || occurredAt > now.getTime()) continue
    const amount = amountOf(tx)
    if (amount <= 0) continue
    eligibleTransactionCount += 1
    const category = tx.category_name?.trim() || '未分类支出'
    const categoryStat = byCategory.get(category) || { current: 0, previous: 0, count: 0 }
    if (occurredAt >= currentStart) {
      categoryStat.current += amount
      categoryStat.count += 1
      currentExpense += amount
      const note = normalizedNote(tx.note)
      if (note) {
        const noteStat = byNote.get(note) || { total: 0, count: 0, amounts: [], dates: [] }
        noteStat.total += amount
        noteStat.count += 1
        noteStat.amounts.push(amount)
        noteStat.dates.push(occurredAt)
        byNote.set(note, noteStat)
      }
    } else {
      categoryStat.previous += amount
      previousExpense += amount
    }
    byCategory.set(category, categoryStat)
  }

  const insights: SeanSpendInsight[] = []
  for (const [category, stat] of byCategory) {
    if (stat.count >= 6 && stat.current >= 200) {
      insights.push({
        id: `frequent:${category}`,
        kind: 'frequent',
        title: category,
        currentAmount: stat.current,
        previousAmount: stat.previous,
        transactionCount: stat.count,
        detail: 'high-frequency',
        query: category,
      })
    }
    if (stat.current >= 200 && stat.current - stat.previous >= 100 && stat.current >= stat.previous * 1.25) {
      insights.push({
        id: `rising:${category}`,
        kind: 'rising',
        title: category,
        currentAmount: stat.current,
        previousAmount: stat.previous,
        transactionCount: stat.count,
        detail: 'spend-growth',
        query: category,
      })
    }
  }

  for (const [note, stat] of byNote) {
    if (stat.count < 3 || stat.total < 100) continue
    const min = Math.min(...stat.amounts)
    const max = Math.max(...stat.amounts)
    if (min <= 0 || max / min > 1.15) continue
    const orderedDates = [...stat.dates].sort((a, b) => a - b)
    const intervals = orderedDates.slice(1).map((date, index) => (date - orderedDates[index]) / DAY_MS)
    const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length
    if (averageInterval < 20 || averageInterval > 40) continue
    insights.push({
      id: `subscription:${note}`,
      kind: 'subscription',
      title: note,
      currentAmount: stat.total,
      previousAmount: 0,
      transactionCount: stat.count,
      detail: 'recurring-charge',
      query: note,
    })
  }

  return {
    currentExpense,
    previousExpense,
    eligibleTransactionCount,
    insights: insights.sort((a, b) => b.currentAmount - a.currentAmount).slice(0, 8),
  }
}
