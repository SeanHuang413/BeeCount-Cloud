import type { WorkspaceTransaction } from '@beecount/api-client'

export function localReportDay(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Saved ledger-currency amounts take precedence; never assume a missing FX rate is 1. */
export function reportAmount(tx: WorkspaceTransaction, currency: string): number | null {
  if (tx.native_amount == null && (tx.currency_code || currency).toUpperCase() !== currency.toUpperCase()) return null
  const amount = Number(tx.native_amount ?? tx.amount)
  return Number.isFinite(amount) ? Math.abs(amount) : null
}

export function prepareReportTransactions(rows: WorkspaceTransaction[], currency: string, now = new Date()) {
  const transactions: WorkspaceTransaction[] = []
  const ignoredCurrencies = new Set<string>()
  let invalidCount = 0
  let ignoredCount = 0
  for (const tx of rows) {
    const date = new Date(tx.happened_at)
    if (!Number.isFinite(date.getTime()) || date > now) { invalidCount++; continue }
    const amount = reportAmount(tx, currency)
    if (amount === null) {
      if (tx.native_amount == null && (tx.currency_code || currency).toUpperCase() !== currency.toUpperCase()) {
        ignoredCurrencies.add((tx.currency_code || '').toUpperCase()); ignoredCount++
      } else invalidCount++
      continue
    }
    transactions.push({ ...tx, native_amount: amount })
  }
  return { transactions, ignoredCount, invalidCount, ignoredCurrencies: [...ignoredCurrencies].sort() }
}
