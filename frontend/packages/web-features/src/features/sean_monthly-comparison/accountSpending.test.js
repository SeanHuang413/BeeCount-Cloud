import { describe, expect, it } from 'vitest'
import { analyzeAccountSpending } from './accountSpending'

const now = new Date(2026, 0, 12, 12)
const account = (id, type = 'bank_card', name = id) => ({ id, name, account_type: type, currency: 'CNY', initial_balance: 0 })
const tx = (id, account_id, amount, overrides = {}) => ({ id, account_id, amount, tx_type: 'expense', currency_code: 'CNY', happened_at: new Date(2026, 0, 1).toISOString(), ...overrides })
const run = (items, accounts, selected = '__all') => analyzeAccountSpending(items, accounts, 'CNY', selected, now)

describe('account spending trend', () => {
  it('builds individual series ranked by spending and omits accounts without valid expenses', () => {
    const accounts = [account('bank'), account('card', 'credit_card'), account('empty'), account('income-only')]
    const result = run([tx('bank-expense', 'bank', 20), tx('card-expense', 'card', 30),
      tx('old', 'empty', 99, { happened_at: new Date(2025, 0, 1).toISOString() }),
      tx('salary', 'income-only', 1000, { tx_type: 'income' })], accounts)
    expect(result.profiles.map(row => [row.account.id, row.type, row.total])).toEqual([
      ['card', 'credit_card', 30], ['bank', 'bank_card', 20],
    ])
    expect(result.profiles[0].amounts['2025-02']).toBe(0)
    expect(result.profiles[0].amounts['2026-01']).toBe(30)
    // Comparison series remain complete when viewing a single account.
    expect(run([tx('b', 'bank', 20), tx('c', 'card', 30)], accounts, 'bank').profiles).toHaveLength(2)
  })
  it('counts purchases once and excludes income, transfers, repayments, excluded and future records', () => {
    const accounts = [account('card', 'credit_card'), account('bank')]
    const result = run([tx('purchase', 'card', 1000), tx('repayment', 'bank', 1000, { tx_type: 'transfer', to_account_id: 'card' }),
      tx('income', 'bank', 2000, { tx_type: 'income' }), tx('hidden-stat', 'card', 99, { exclude_from_stats: true }),
      tx('future', 'card', 88, { happened_at: new Date(2026, 0, 13).toISOString() })], accounts)
    expect(result.total).toBe(1000)
    expect(result.count).toBe(1)
    expect(run([tx('purchase', 'card', 1000)], accounts, 'bank').total).toBe(0)
  })
  it('keeps twelve calendar months across years including empty months', () => {
    const result = run([tx('old', 'a', 200, { happened_at: new Date(2025, 0, 31).toISOString() }),
      tx('first', 'a', 20, { happened_at: new Date(2025, 1, 1).toISOString() }), tx('last', 'a', 30)], [account('a')])
    expect(result.buckets).toHaveLength(12)
    expect(result.buckets[0].month).toBe('2025-02')
    expect(result.buckets[0].amount).toBe(20)
    expect(result.buckets[1].amount).toBe(0)
    expect(result.total).toBe(50)
  })
  it('resolves identity by ID and only uses unique legacy names', () => {
    const accounts = [account('a', 'bank_card', '同名'), account('b', 'bank_card', '同名'), account('c', 'cash', '现金')]
    const result = run([tx('id', 'a', 10, { account_name: '现金' }), tx('ambiguous', null, 20, { account_name: '同名' }),
      tx('legacy', null, 30, { account_name: '现金' }), tx('missing', 'deleted', 40, { account_name: '现金' })], accounts)
    expect(result.total).toBe(40)
    expect(result.unmatchedCount).toBe(2)
    expect(run([tx('id', 'a', 10)], accounts, 'a').total).toBe(10)
  })
  it('retains hidden flow accounts and excludes valuation accounts even when their names resemble cash', () => {
    const accounts = [{ ...account('bank'), hidden: true }, account('cash-investment', 'investment', '现金'),
      ...['social_fund', 'insurance', 'real_estate', 'vehicle', 'loan'].map(type => account(type, type))]
    const result = run(accounts.map(row => tx(row.id, row.id, 10)), accounts)
    expect(result.eligible.map(row => row.id)).toEqual(['bank'])
    expect(result.total).toBe(10)
    expect(result.unmatchedCount).toBe(6)
  })
  it('uses saved base-currency snapshots and excludes foreign records without them', () => {
    const result = run([tx('converted', 'a', 100, { currency_code: 'USD', native_amount: 700 }),
      tx('missing', 'a', 100, { currency_code: 'USD' }), tx('invalid', 'a', 'bad')], [account('a')])
    expect(result.total).toBe(700)
    expect(result.ignoredCount).toBe(2)
    expect(result.buckets.at(-1).average).toBe(700)
    expect(run([], [account('a')], 'deleted').selectedId).toBe('__all')
  })
})
