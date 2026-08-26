import type { WorkspaceAccount, WorkspaceTransaction } from '@beecount/api-client'

export type ReconciliationClue = {
  id: string
  kind: 'single' | 'combination' | 'duplicate'
  title: string
  reason: string
  transactions: WorkspaceTransaction[]
}

const RECONCILABLE_TYPES = new Set(['cash', 'bank_card', 'credit_card', 'alipay', 'wechat', 'other'])
export function reconciliationAccountBalance(account: WorkspaceAccount): number {
  return typeof account.balance === 'number' ? account.balance : account.initial_balance ?? 0
}
export function isReconciliableAccount(account: WorkspaceAccount): boolean {
  return RECONCILABLE_TYPES.has(account.account_type || 'other')
}
export function transactionTouchesAccount(tx: WorkspaceTransaction, account: WorkspaceAccount): boolean {
  const ids = [tx.account_id, tx.from_account_id, tx.to_account_id].filter(Boolean)
  if (ids.includes(account.id)) return true
  const names = [tx.account_name, tx.from_account_name, tx.to_account_name].filter(Boolean)
  return names.includes(account.name)
}
function amountOf(tx: WorkspaceTransaction): number { return Math.abs(Number(tx.native_amount ?? tx.amount) || 0) }
function labelOf(tx: WorkspaceTransaction): string { return (tx.note || tx.category_name || '未命名交易').trim().toLocaleLowerCase() }
function closeTo(value: number, target: number): boolean { return Math.abs(value - target) <= Math.max(0.01, target * 0.02) }

export function findReconciliationClues(
  transactions: WorkspaceTransaction[], account: WorkspaceAccount, difference: number,
): ReconciliationClue[] {
  const rows = transactions.filter((tx) => transactionTouchesAccount(tx, account))
    .slice().sort((a, b) => b.happened_at.localeCompare(a.happened_at)).slice(0, 120)
  const target = Math.abs(difference)
  if (target < 0.005) return []
  const clues: ReconciliationClue[] = []
  const used = new Set<string>()

  for (const tx of rows) {
    if (!closeTo(amountOf(tx), target)) continue
    clues.push({ id: `single:${tx.id}`, kind: 'single', title: '单笔金额接近差额',
      reason: '这笔交易的金额与当前差额接近，可优先核对金额、账户和收支方向。', transactions: [tx] })
    used.add(tx.id)
    if (clues.length >= 5) break
  }

  const pairRows = rows.slice(0, 60)
  for (let left = 0; left < pairRows.length && clues.filter((row) => row.kind === 'combination').length < 3; left += 1) {
    for (let right = left + 1; right < pairRows.length; right += 1) {
      if (!closeTo(amountOf(pairRows[left]) + amountOf(pairRows[right]), target)) continue
      clues.push({ id: `combination:${pairRows[left].id}:${pairRows[right].id}`, kind: 'combination',
        title: '两笔合计接近差额', reason: '这两笔交易金额合计与当前差额接近，可检查是否存在漏记、重复或账户选错。',
        transactions: [pairRows[left], pairRows[right]] })
      break
    }
  }

  const latestByFingerprint = new Map<string, WorkspaceTransaction>()
  for (const tx of [...rows].reverse()) {
    const fingerprint = `${tx.happened_at.slice(0, 10)}:${tx.tx_type}:${labelOf(tx)}:${amountOf(tx).toFixed(2)}`
    const previous = latestByFingerprint.get(fingerprint)
    latestByFingerprint.set(fingerprint, tx)
    if (!previous || used.has(tx.id)) continue
    clues.push({ id: `duplicate:${tx.id}:${previous.id}`, kind: 'duplicate', title: '同日疑似重复交易',
      reason: '同一天存在相同名称、金额和类型的两笔交易。', transactions: [tx, previous] })
    if (clues.filter((row) => row.kind === 'duplicate').length >= 3) break
  }
  return clues.slice(0, 10)
}
