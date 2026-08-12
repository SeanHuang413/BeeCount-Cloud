import { describe, expect, it } from 'vitest'

import { analyzeSeanMonthlyComparison } from './analyzeSeanMonthlyComparison'

const tx = (overrides) => ({ tx_type: 'expense', amount: 100, happened_at: '2026-07-10T00:00:00.000Z', exclude_from_stats: false, ...overrides })

describe('analyzeSeanMonthlyComparison', () => {
  it('fills twelve natural months and excludes transfers and excluded records', () => {
    const rows = analyzeSeanMonthlyComparison([
      tx({ tx_type: 'income', amount: 200 }), tx({ amount: 80 }),
      tx({ tx_type: 'income', amount: 300, happened_at: '2026-08-10T00:00:00.000Z' }),
      tx({ tx_type: 'transfer', amount: 9999 }), tx({ amount: 9999, exclude_from_stats: true }),
    ], new Date('2026-08-12T00:00:00.000Z'))
    expect(rows).toHaveLength(12)
    expect(rows.at(-1)).toMatchObject({ month: '2026-08', isCurrentMonth: true })
    expect(rows.find((row) => row.month === '2026-07')).toMatchObject({ income: 200, expense: 80, balance: 120, count: 2 })
    expect(rows.find((row) => row.month === '2026-08')).toMatchObject({ income: 300, incomeChange: 0.5 })
  })
})
