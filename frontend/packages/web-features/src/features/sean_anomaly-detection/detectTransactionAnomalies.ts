import type { WorkspaceTransaction } from '@beecount/api-client'

export type TransactionAnomalyKind = 'duplicate' | 'rapid-repeat' | 'amount-spike' | 'price-increase' | 'missing-info'
export type TransactionAnomaly = {
  id: string
  kind: TransactionAnomalyKind
  severity: 'high' | 'medium' | 'low'
  title: string
  reason: string
  transaction: WorkspaceTransaction
  related: WorkspaceTransaction[]
}

function amountOf(tx: WorkspaceTransaction): number { return Math.abs(Number(tx.native_amount ?? tx.amount) || 0) }
function labelOf(tx: WorkspaceTransaction): string { return (tx.note || tx.category_name || '未命名交易').trim() }
function normalizedLabel(tx: WorkspaceTransaction): string { return labelOf(tx).toLocaleLowerCase().replace(/\s+/g, '') }
function dayOf(tx: WorkspaceTransaction): string { return tx.happened_at.slice(0, 10) }
function accountOf(tx: WorkspaceTransaction): string { return tx.account_id || tx.from_account_id || tx.to_account_id || tx.account_name || '' }
function median(values: number[]): number {
  const rows = [...values].sort((a, b) => a - b); const middle = Math.floor(rows.length / 2)
  return rows.length % 2 ? rows[middle] : (rows[middle - 1] + rows[middle]) / 2
}
function sameCore(a: WorkspaceTransaction, b: WorkspaceTransaction): boolean {
  return a.tx_type === b.tx_type && normalizedLabel(a) === normalizedLabel(b)
    && accountOf(a) === accountOf(b) && Math.abs(amountOf(a) - amountOf(b)) < 0.01
}

export function detectTransactionAnomalies(transactions: WorkspaceTransaction[]): TransactionAnomaly[] {
  const rows = transactions
    .filter((tx) => tx.tx_type !== 'transfer' && !tx.exclude_from_stats && amountOf(tx) > 0)
    .slice().sort((a, b) => a.happened_at.localeCompare(b.happened_at))
  const anomalies: TransactionAnomaly[] = []
  const duplicateIds = new Set<string>()

  const latestByFingerprint = new Map<string, WorkspaceTransaction>()
  for (const current of rows) {
    const fingerprint = `${dayOf(current)}:${current.tx_type}:${normalizedLabel(current)}:${accountOf(current)}:${amountOf(current).toFixed(2)}`
    const closest = latestByFingerprint.get(fingerprint)
    latestByFingerprint.set(fingerprint, current)
    if (!closest || !sameCore(closest, current)) continue
    const minutes = Math.abs(new Date(current.happened_at).getTime() - new Date(closest.happened_at).getTime()) / 60000
    const rapid = minutes <= 15
    duplicateIds.add(current.id)
    anomalies.push({
      id: `${rapid ? 'rapid-repeat' : 'duplicate'}:${current.id}`, kind: rapid ? 'rapid-repeat' : 'duplicate',
      severity: 'high', title: rapid ? '短时间内疑似重复扣款' : '同日疑似重复记账',
      reason: rapid ? `与另一笔同金额交易仅相隔 ${Math.round(minutes)} 分钟` : '同一天存在相同名称、金额和账户的交易',
      transaction: current, related: [closest],
    })
  }

  const groups = new Map<string, WorkspaceTransaction[]>()
  for (const row of rows) {
    const key = `${row.tx_type}:${normalizedLabel(row)}`
    groups.set(key, [...(groups.get(key) || []), row])
  }
  for (const samples of groups.values()) {
    if (samples.length < 4) continue
    for (let index = 3; index < samples.length; index += 1) {
      const current = samples[index]
      if (duplicateIds.has(current.id)) continue
      const baselineRows = samples.slice(Math.max(0, index - 6), index)
      const typical = median(baselineRows.map(amountOf))
      const currentAmount = amountOf(current)
      if (typical <= 0) continue
      if (currentAmount >= Math.max(typical * 2.5, typical + 100)) {
        anomalies.push({ id: `amount-spike:${current.id}`, kind: 'amount-spike', severity: 'medium',
          title: '金额明显高于历史水平', reason: `本次金额约为近期典型金额的 ${(currentAmount / typical).toFixed(1)} 倍`,
          transaction: current, related: baselineRows.slice(-3) })
      } else if (currentAmount >= typical * 1.2 && currentAmount - typical >= 5) {
        const months = new Set(baselineRows.map((row) => row.happened_at.slice(0, 7)))
        if (months.size >= 3) anomalies.push({ id: `price-increase:${current.id}`, kind: 'price-increase', severity: 'low',
          title: '周期消费可能涨价', reason: `近期典型金额约为 ${typical.toFixed(2)}，本次上涨 ${((currentAmount / typical - 1) * 100).toFixed(0)}%`,
          transaction: current, related: baselineRows.slice(-3) })
      }
    }
  }

  for (const tx of rows) {
    if (amountOf(tx) < 1000 || duplicateIds.has(tx.id)) continue
    const missing: string[] = []
    if (!tx.category_name && !tx.category_id) missing.push('分类')
    if (!accountOf(tx)) missing.push('账户')
    if (!tx.note?.trim()) missing.push('备注')
    if (missing.length >= 2) anomalies.push({ id: `missing-info:${tx.id}`, kind: 'missing-info', severity: 'medium',
      title: '大额交易信息不完整', reason: `缺少${missing.join('、')}，可能影响后续报表判断`, transaction: tx, related: [] })
  }

  const severityOrder = { high: 0, medium: 1, low: 2 }
  return anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    || b.transaction.happened_at.localeCompare(a.transaction.happened_at))
}
