import { describe, expect, it } from 'vitest'
import { findReconciliationClues, isReconciliableAccount, transactionTouchesAccount } from './reconciliation'

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
    expect(transactionTouchesAccount({ ...tx('a', 10), account_id: null, from_account_id: 'bank' }, account)).toBe(true)
  })
  it('finds single and two-row amount clues', () => {
    const result = findReconciliationClues([tx('a', 150), tx('b', 50), tx('c', 100)], account, -150)
    expect(result.some((row) => row.kind === 'single')).toBe(true)
    expect(result.some((row) => row.kind === 'combination')).toBe(true)
  })
})
