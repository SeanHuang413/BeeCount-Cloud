import { describe, expect, it } from 'vitest'
import { buildCashflowForecast } from './cashflowForecast'

const tx = (id, month, amount, type = 'expense') => ({
  id, tx_type: type, amount, native_amount: amount, happened_at: `${month}-05T08:00:00Z`,
  note: type === 'income' ? '工资' : '房租', category_name: null, currency_code: 'CNY',
})

describe('buildCashflowForecast', () => {
  it('computes daily closing pressure without inventing an intraday event order', () => {
    const rows = ['2026-05', '2026-06', '2026-07'].flatMap((month, i) => [tx(`e${i}`, month, 150), tx(`i${i}`, month, 100, 'income')])
    const accounts = [{ id: 'cash', account_type: 'cash', currency: 'CNY', balance: 100 }]
    const result = buildCashflowForecast(rows, accounts, 'CNY', 30, new Date(2026, 7, 1))
    expect(result.lowestBalance).toBe(50)
    expect(result.projectedBalance).toBe(50)
  })
  it('does not collapse several same-name monthly payments into one prediction', () => {
    const rows = [tx('1', '2026-05', 100), tx('2', '2026-06', 100), tx('3', '2026-07', 100), tx('4', '2026-07', 100)]
    const result = buildCashflowForecast(rows, [], 'CNY', 30, new Date(2026, 7, 1))
    expect(result.events).toEqual([])
    expect(result.omittedGroups).toBe(1)
  })
  it('shows source evidence and does not let future rows replace historical samples', () => {
    const rows = [tx('1', '2026-05', 100), tx('2', '2026-06', 100), tx('3', '2026-07', 100), tx('future', '2027-01', 9000)]
    const result = buildCashflowForecast(rows, [], 'CNY', 30, new Date(2026, 7, 1))
    expect(result.events[0].evidence.map((row) => row.id)).toEqual(['1', '2', '3'])
  })
  it('only forecasts stable recurring rows and includes a due credit card', () => {
    const transactions = [tx('1', '2026-05', 3000), tx('2', '2026-06', 3050), tx('3', '2026-07', 3000)]
    const accounts = [
      { id: 'cash', name: '工资卡', account_type: 'bank_card', currency: 'CNY', balance: 10000 },
      { id: 'card', name: '信用卡', account_type: 'credit_card', currency: 'CNY', balance: -2400, payment_due_day: 12 },
    ]
    const result = buildCashflowForecast(transactions, accounts, 'CNY', 30, new Date(2026, 7, 1))
    expect(result.events.map((event) => [event.date, event.title, event.amount])).toEqual([
      ['2026-08-05', '房租', 3000], ['2026-08-12', '信用卡还款', 2400],
    ])
    expect(result.projectedBalance).toBe(4600)
    expect(result.lowestBalanceDate).toBe('2026-08-12')
  })

  it('does not forecast volatile or insufficient history', () => {
    const transactions = [tx('1', '2026-05', 100), tx('2', '2026-06', 800), tx('3', '2026-07', 100)]
    expect(buildCashflowForecast(transactions, [], 'CNY', 30, new Date(2026, 7, 1)).events).toEqual([])
  })

  it('does not treat sparse old rows as a monthly schedule', () => {
    const transactions = [tx('1', '2025-05', 100), tx('2', '2025-09', 100), tx('3', '2026-03', 100)]
    expect(buildCashflowForecast(transactions, [], 'CNY', 30, new Date(2026, 7, 1)).events).toEqual([])
  })
})
