import { describe, expect, it } from 'vitest'
import { detectTransactionAnomalies } from './detectTransactionAnomalies'

const tx = (id, happenedAt, amount, note = '咖啡', extra = {}) => ({
  id, happened_at: happenedAt, amount, native_amount: amount, note, tx_type: 'expense',
  category_name: '餐饮', category_id: 'food', account_name: '银行卡', account_id: 'bank', ...extra,
})

describe('detectTransactionAnomalies', () => {
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
