import { describe, expect, it } from 'vitest'
import { findReconciliationClues, isReconciliableAccount, reconciliationImpact, transactionTouchesAccount } from './reconciliation'

const account = { id: 'bank', name: '银行卡', account_type: 'bank_card', balance: 1000, initial_balance: 0 }
const tx = (id, amount, date = '2026-08-01T08:00:00Z') => ({
  id, amount, native_amount: amount, happened_at: date, tx_type: 'expense', note: '消费', account_id: 'bank', account_name: '银行卡',
})

describe('account reconciliation helpers', () => {
  it('only includes accounts that support transaction flows', () => {
    expect(isReconciliableAccount(account)).toBe(true)
    expect(isReconciliableAccount({ ...account, account_type: 'real_estate' })).toBe(false)
  })
  it('matches account ids including transfer endpoints', () => {
    expect(transactionTouchesAccount({ ...tx('a', 10), tx_type: 'transfer', account_id: null, from_account_id: 'bank' }, account)).toBe(true)
  })
  it('does not match an authoritative ID by an identical name', () => {
    expect(transactionTouchesAccount({ ...tx('a', 10), account_id: 'different' }, account)).toBe(false)
    expect(isReconciliableAccount({ name: '我的投资', account_type: null })).toBe(false)
  })
  it('computes net combinations rather than adding absolute income and expense', () => {
    const rows = [tx('expense', 100), { ...tx('income', 60), tx_type: 'income' }]
    expect(findReconciliationClues(rows, account, -40).some((row) => row.kind === 'combination')).toBe(true)
    expect(findReconciliationClues(rows, account, -160).some((row) => row.kind === 'combination')).toBe(false)
  })
  it('uses account currency and only available converted amounts', () => {
    const foreign = { ...tx('fx', 10), currency_code: 'USD', native_amount: 72 }
    expect(reconciliationImpact(foreign, { ...account, currency: 'USD' }, 'CNY')).toBe(-10)
    expect(reconciliationImpact(foreign, { ...account, currency: 'CNY' }, 'CNY')).toBeNull()
    expect(reconciliationImpact(foreign, { ...account, currency: 'EUR' }, 'CNY')).toBeNull()
  })
  it('handles transfer direction and self transfers', () => {
    const transfer = { ...tx('t', 80), tx_type: 'transfer', from_account_id: 'bank', to_account_id: 'other' }
    expect(reconciliationImpact(transfer, account)).toBe(-80)
    expect(reconciliationImpact({ ...transfer, from_account_id: 'other', to_account_id: 'bank' }, account)).toBe(80)
    expect(reconciliationImpact({ ...transfer, to_account_id: 'bank' }, account)).toBe(0)
  })
  it('finds single and two-row amount clues', () => {
    const result = findReconciliationClues([tx('a', 150), tx('b', 50), tx('c', 100)], account, -150)
    expect(result.some((row) => row.kind === 'single')).toBe(true)
    expect(result.some((row) => row.kind === 'combination')).toBe(true)
  })
})
