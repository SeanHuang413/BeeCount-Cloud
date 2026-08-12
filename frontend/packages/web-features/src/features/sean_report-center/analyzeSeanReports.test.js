import { describe, expect, it } from 'vitest'

import { analyzeSeanReports } from './analyzeSeanReports'

const tx = (overrides) => ({
  id: Math.random().toString(),
  tx_type: 'expense', amount: 12, happened_at: '2026-08-01T12:00:00.000Z',
  note: '地铁', category_name: null, tags: null, tags_list: ['通勤'], exclude_from_stats: false,
  ...overrides,
})

describe('analyzeSeanReports', () => {
  it('keeps transfers and statistics-excluded records out of reports', () => {
    const data = analyzeSeanReports([
      tx({ amount: 30 }), tx({ amount: 40 }), tx({ amount: 50 }),
      tx({ tx_type: 'transfer', amount: 9999 }), tx({ amount: 9999, exclude_from_stats: true }),
    ])
    expect(data.repeatMerchants).toEqual([expect.objectContaining({ name: '地铁', count: 3, expense: 120 })])
    expect(data.tags).toEqual([expect.objectContaining({ name: '通勤', expense: 120, income: 0 })])
  })

  it('does not mix income into the frequent spending report', () => {
    const data = analyzeSeanReports([
      tx({ amount: 20 }), tx({ amount: 20 }), tx({ amount: 20 }),
      tx({ tx_type: 'income', amount: 1000, note: '地铁' }),
    ])
    expect(data.repeatMerchants).toEqual([expect.objectContaining({ name: '地铁', count: 3, expense: 60, income: 0 })])
    expect(data.tags).toEqual([expect.objectContaining({ name: '通勤', expense: 60 })])
    expect(data.incomeSources).toEqual([expect.objectContaining({ name: '地铁', count: 1, income: 1000 })])
  })
})
