import { describe, expect, it } from 'vitest'

import { analyzeSeanSpendCandidates } from './analyzeSpendCandidates'

const now = new Date('2026-08-12T12:00:00Z')
const tx = (overrides) => ({
  id: crypto.randomUUID(), tx_index: 1, tx_type: 'expense', amount: 50, happened_at: '2026-08-01T12:00:00Z', note: null,
  category_name: '餐饮', category_kind: 'expense', account_name: '现金', from_account_name: null, to_account_name: null,
  tags: null, tags_list: [], attachments: null, last_change_id: 1, ledger_id: 'ledger-1', ledger_name: '账本',
  created_by_user_id: null, created_by_email: null, ...overrides,
})

describe('analyzeSeanSpendCandidates', () => {
  it('finds frequent spending, growth, and recurring charges while excluding ignored transactions', () => {
    const frequent = Array.from({ length: 6 }, (_, index) => tx({ id: `food-${index}`, amount: 50, happened_at: `2026-0${6 + Math.floor(index / 3)}-0${index + 1}T12:00:00Z` }))
    const recurring = ['2026-05-15', '2026-06-15', '2026-07-15'].map((date, index) => tx({ id: `video-${index}`, category_name: '娱乐', amount: 40, note: 'Video Plus', happened_at: `${date}T12:00:00Z` }))
    const ignored = tx({ id: 'ignored', amount: 9999, exclude_from_stats: true })
    const result = analyzeSeanSpendCandidates([...frequent, ...recurring, ignored], now)
    expect(result.insights.map((item) => item.kind)).toEqual(expect.arrayContaining(['frequent', 'subscription']))
    expect(result.currentExpense).toBeLessThan(1000)
  })

  it('compares the current 90 days with the preceding 90 days', () => {
    const result = analyzeSeanSpendCandidates([
      tx({ category_name: '购物', amount: 350, happened_at: '2026-07-01T12:00:00Z' }),
      tx({ category_name: '购物', amount: 100, happened_at: '2026-03-01T12:00:00Z' }),
    ], now)
    expect(result.insights.some((item) => item.kind === 'rising' && item.title === '购物')).toBe(true)
  })
})
