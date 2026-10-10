import type { WorkspaceAccount, WorkspaceTransaction } from '@beecount/api-client'
import { localReportDay } from '../sean_shared/reportData'

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
  if (!account.account_type && /房产|房屋|车辆|汽车|投资|基金|股票|保险|社保|公积金|医保|贷款/.test(`${account.name} ${account.bank_name || ''}`)) return false
  return RECONCILABLE_TYPES.has(account.account_type || 'other')
}
export function transactionTouchesAccount(tx: WorkspaceTransaction, account: WorkspaceAccount): boolean {
  const matches = (id: string | null | undefined, name: string | null) => id ? id === account.id : name === account.name
  return tx.tx_type === 'transfer'
    ? matches(tx.from_account_id || tx.account_id, tx.from_account_name || tx.account_name) || matches(tx.to_account_id, tx.to_account_name)
    : matches(tx.account_id, tx.account_name)
}
/** Official account balances use original amount, never the ledger-currency snapshot. */
export function reconciliationImpact(tx: WorkspaceTransaction, account: WorkspaceAccount, ledgerCurrency = account.currency || 'CNY'): number | null {
  if (!transactionTouchesAccount(tx, account)) return null
  const currency = (account.currency || ledgerCurrency).toUpperCase()
  const originalCurrency = (tx.currency_code || ledgerCurrency).toUpperCase()
  const amount = currency === originalCurrency ? Math.abs(Number(tx.amount)) : null
  if (amount === null || !Number.isFinite(amount)) return null
  if (tx.tx_type !== 'transfer') return tx.tx_type === 'income' ? amount : -amount
  const matches = (id: string | null | undefined, name: string | null) => id ? id === account.id : name === account.name
  const from = matches(tx.from_account_id || tx.account_id, tx.from_account_name || tx.account_name)
  const to = matches(tx.to_account_id, tx.to_account_name)
  return (Number(to) - Number(from)) * amount
}
function labelOf(tx: WorkspaceTransaction): string { return (tx.note || tx.category_name || '未命名交易').trim().toLocaleLowerCase() }
function closeTo(value: number, target: number): boolean { return Math.abs(value - target) <= Math.max(0.01, target * 0.02) }

export function findReconciliationClues(
  transactions: WorkspaceTransaction[], account: WorkspaceAccount, difference: number, ledgerCurrency = account.currency || 'CNY',
): ReconciliationClue[] {
  const rows = transactions.filter((tx) => reconciliationImpact(tx, account, ledgerCurrency) !== null && Number.isFinite(new Date(tx.happened_at).getTime()))
    .slice().sort((a, b) => b.happened_at.localeCompare(a.happened_at)).slice(0, 120)
  const target = Math.abs(difference)
  if (target < 0.005) return []
  const clues: ReconciliationClue[] = []
  const used = new Set<string>()
  const impact = (tx: WorkspaceTransaction) => reconciliationImpact(tx, account, ledgerCurrency)!

  for (const tx of rows) {
    if (!closeTo(Math.abs(impact(tx)), target)) continue
    clues.push({ id: `single:${tx.id}`, kind: 'single', title: '单笔金额接近差额',
      reason: `${impact(tx) * difference > 0 ? '若存在漏记或少记，此方向可能扩大实际余额与账本余额的差额' : '若存在重复或多记，此方向可能造成当前差额'}；仅为金额线索，请人工核对。`, transactions: [tx] })
    used.add(tx.id)
    if (clues.length >= 5) break
  }

  const pairRows = rows.slice(0, 60)
  for (let left = 0; left < pairRows.length && clues.filter((row) => row.kind === 'combination').length < 3; left += 1) {
    for (let right = left + 1; right < pairRows.length; right += 1) {
      if (!closeTo(Math.abs(impact(pairRows[left]) + impact(pairRows[right])), target)) continue
      clues.push({ id: `combination:${pairRows[left].id}:${pairRows[right].id}`, kind: 'combination',
        title: '两笔净变动接近差额', reason: '按所选账户的收入、支出与转入转出方向计算，两笔净变动的绝对值接近差额；需人工核对是否漏记或多记。',
        transactions: [pairRows[left], pairRows[right]] })
      break
    }
  }

  const latestByFingerprint = new Map<string, WorkspaceTransaction>()
  for (const tx of [...rows].reverse()) {
    const fingerprint = `${localReportDay(tx.happened_at)}:${tx.tx_type}:${labelOf(tx)}:${impact(tx).toFixed(2)}:${(tx.currency_code || ledgerCurrency).toUpperCase()}`
    const previous = latestByFingerprint.get(fingerprint)
    latestByFingerprint.set(fingerprint, tx)
    if (!previous || used.has(tx.id)) continue
    clues.push({ id: `duplicate:${tx.id}:${previous.id}`, kind: 'duplicate', title: '同日疑似重复交易',
      reason: '同一天存在相同名称、金额和类型的两笔交易。', transactions: [tx, previous] })
    if (clues.filter((row) => row.kind === 'duplicate').length >= 3) break
  }
  return clues.slice(0, 10)
}
