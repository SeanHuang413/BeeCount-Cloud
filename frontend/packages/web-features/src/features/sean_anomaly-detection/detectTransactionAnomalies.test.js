import { describe, expect, it } from 'vitest'
import { detectTransactionAnomalies } from './detectTransactionAnomalies'

const tx = (id, happenedAt, amount, note = '咖啡', extra = {}) => ({
  id, happened_at: happenedAt, amount, native_amount: amount, note, tx_type: 'expense',
  category_name: '餐饮', category_id: 'food', account_name: '银行卡', account_id: 'bank', ...extra,
})

describe('detectTransactionAnomalies', () => {
  it('does not assert same-account repeats when the account is unknown', () => {
    const rows = [tx('a', '2026-08-01T08:00:00Z', 20, '咖啡', { account_id: null, account_name: null }), tx('b', '2026-08-01T08:01:00Z', 20, '咖啡', { account_id: null, account_name: null })]
    expect(detectTransactionAnomalies(rows)).toEqual([])
  })
  it('compares original amounts for duplicates and does not call exchange-rate changes a price increase', () => {
    const repeat = [tx('a', '2026-08-01T08:00:00Z', 10, '咖啡', { currency_code: 'USD', native_amount: 70 }), tx('b', '2026-08-01T08:02:00Z', 10, '咖啡', { currency_code: 'USD', native_amount: 71 })]
    expect(detectTransactionAnomalies(repeat)[0].kind).toBe('rapid-repeat')
    const monthly = ['2026-04', '2026-05', '2026-06', '2026-07'].map((month, i) => tx(`${i}`, `${month}-05T08:00:00Z`, 10, '订阅', { currency_code: 'USD', native_amount: i === 3 ? 130 : 100 }))
    expect(detectTransactionAnomalies(monthly).some((row) => row.kind === 'price-increase')).toBe(false)
  })
  it('detects rapid repeats across local midnight and compares actual instants', () => {
    const first = new Date(2026, 7, 1, 23, 58)
    const second = new Date(2026, 7, 2, 0, 3)
    expect(detectTransactionAnomalies([tx('a', first.toISOString(), 28), tx('b', second.toISOString(), 28)])[0].kind).toBe('rapid-repeat')
  })
  it('does not compare different original currencies for duplicates or baselines', () => {
    expect(detectTransactionAnomalies([tx('a', '2026-08-01T08:00:00Z', 28, '咖啡', { currency_code: 'USD' }), tx('b', '2026-08-01T08:01:00Z', 28, '咖啡', { currency_code: 'CNY' })])).toEqual([])
  })
  it('requires stable recent consecutive monthly records for a price increase', () => {
    const stable = [tx('a', '2026-04-05T08:00:00Z', 100), tx('b', '2026-05-05T08:00:00Z', 100), tx('c', '2026-06-05T08:00:00Z', 100), tx('d', '2026-07-05T08:00:00Z', 130)]
    expect(detectTransactionAnomalies(stable).some((row) => row.kind === 'price-increase')).toBe(true)
    stable[1].happened_at = '2026-04-22T08:00:00Z'
    expect(detectTransactionAnomalies(stable).some((row) => row.kind === 'price-increase')).toBe(false)
  })
  it('finds a rapid exact repeat', () => {
    const result = detectTransactionAnomalies([
      tx('a', '2026-08-01T08:00:00Z', 28), tx('b', '2026-08-01T08:06:00Z', 28),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ kind: 'rapid-repeat', severity: 'high' })
  })

  it('finds an amount spike against earlier history', () => {
    const result = detectTransactionAnomalies([
      tx('a', '2026-04-01T08:00:00Z', 100), tx('b', '2026-05-01T08:00:00Z', 105),
      tx('c', '2026-06-01T08:00:00Z', 100), tx('d', '2026-07-01T08:00:00Z', 500),
    ])
    expect(result.some((row) => row.kind === 'amount-spike')).toBe(true)
  })

  it('ignores transfers and ordinary variation', () => {
    const result = detectTransactionAnomalies([
      tx('a', '2026-04-01T08:00:00Z', 100), tx('b', '2026-05-01T08:00:00Z', 105),
      tx('c', '2026-06-01T08:00:00Z', 110), tx('d', '2026-07-01T08:00:00Z', 108),
      tx('e', '2026-07-02T08:00:00Z', 9999, '转账', { tx_type: 'transfer' }),
    ])
    expect(result).toEqual([])
  })
})
