import type { WorkspaceAccount, WorkspaceTransaction } from '@beecount/api-client'
import { seanAccountType } from '../sean_assets/assetCenter'

const FLOW_TYPES = new Set(['cash', 'bank_card', 'credit_card', 'alipay', 'wechat', 'other'])
export const spendingMonth = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
export function spendingAmount(tx: WorkspaceTransaction, currency: string) {
  if (tx.native_amount == null && (tx.currency_code || currency).toUpperCase() !== currency.toUpperCase()) return null
  const amount = Math.abs(Number(tx.native_amount ?? tx.amount))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function analyzeAccountSpending(transactions: WorkspaceTransaction[], accounts: WorkspaceAccount[], currency: string, accountId = '__all', now = new Date()) {
  const eligible = accounts.filter(row => FLOW_TYPES.has(seanAccountType(row)))
    .sort((a, b) => a.name.localeCompare(b.name))
  const eligibleIds = new Set(eligible.map(row => row.id))
  const byName = new Map<string, WorkspaceAccount[]>()
  for (const account of accounts) byName.set(account.name, [...(byName.get(account.name) || []), account])
  const months = Array.from({ length: 12 }, (_, index) => spendingMonth(new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)))
  const buckets = months.map(month => ({ month, amount: 0, count: 0, average: 0, items: [] as WorkspaceTransaction[] }))
  const byMonth = new Map(buckets.map(row => [row.month, row]))
  const profiles = new Map(eligible.map(account => [account.id, { account, type: seanAccountType(account), total: 0, count: 0, amounts: Object.fromEntries(months.map(month => [month, 0])) as Record<string, number> }]))
  const selectedId = eligibleIds.has(accountId) ? accountId : '__all'
  let unmatchedCount = 0
  let ignoredCount = 0
  for (const tx of transactions) {
    if (tx.tx_type !== 'expense' || tx.exclude_from_stats) continue
    const date = new Date(tx.happened_at)
    if (!Number.isFinite(date.getTime()) || date > now) continue
    const bucket = byMonth.get(spendingMonth(date))
    if (!bucket) continue
    const amount = spendingAmount(tx, currency)
    if (amount === null) { ignoredCount++; continue }
    const named = byName.get(tx.account_name || '')
    const id = tx.account_id || (named?.length === 1 ? named[0].id : '')
    if (!eligibleIds.has(id)) { unmatchedCount++; continue }
    const profile = profiles.get(id)!
    profile.total += amount
    profile.count++
    profile.amounts[bucket.month] += amount
    if (selectedId !== '__all' && id !== selectedId) continue
    bucket.items.push(tx)
    bucket.amount += amount
    bucket.count++
    bucket.average = bucket.amount / bucket.count
  }
  return { eligible, selectedId, buckets, unmatchedCount, ignoredCount,
    profiles: [...profiles.values()].filter(row => row.count > 0).sort((a, b) => b.total - a.total || a.account.id.localeCompare(b.account.id)),
    total: buckets.reduce((sum, row) => sum + row.amount, 0), count: buckets.reduce((sum, row) => sum + row.count, 0) }
}
