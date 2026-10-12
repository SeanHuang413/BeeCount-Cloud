import { describe, expect, it } from 'vitest'
import { categoryDetailTransactions } from './detailTransactions'

const tx = (id, month, day, amount, note = '') => ({ id, happened_at: new Date(2026, month - 1, day, 12).toISOString(), amount, note, currency_code: 'CNY' })

describe('category detail navigation and filters', () => {
  it('switches months without including the adjacent month or mutating the source', () => {
    const items = [tx('jul', 7, 31, 20), tx('aug', 8, 1, 30)]
    expect(categoryDetailTransactions(items, 'CNY', '2026-07', '', 'date').periodTotal).toBe(20)
    expect(categoryDetailTransactions(items, 'CNY', '2026-08', '', 'date').periodTotal).toBe(30)
    expect(categoryDetailTransactions(items, 'CNY', '2026-09', '', 'date').period).toEqual([])
    expect(categoryDetailTransactions(items, 'CNY', '', '', 'date').periodTotal).toBe(50)
    expect(items.map(item => item.id)).toEqual(['jul', 'aug'])
  })
  it('preserves period totals while searching notes and ignores whitespace and casing', () => {
    const items = [tx('a', 7, 1, 10, 'Coffee'), tx('b', 7, 2, 20, '午餐'), tx('c', 8, 1, 100, 'Coffee')]
    const result = categoryDetailTransactions(items, 'CNY', '2026-07', ' COFFEE ', 'date')
    expect(result.periodTotal).toBe(30)
    expect(result.filteredTotal).toBe(10)
    expect(result.filtered.map(item => item.id)).toEqual(['a'])
  })
  it('sorts by saved base-currency amount and breaks ties by date', () => {
    const items = [tx('recent', 7, 3, 1), { ...tx('foreign', 7, 1, 100), currency_code: 'USD', native_amount: 5 }, tx('tie', 7, 2, 5)]
    expect(categoryDetailTransactions(items, 'CNY', '', '', 'amount').filtered.map(item => item.id)).toEqual(['tie', 'foreign', 'recent'])
    expect(categoryDetailTransactions(items, 'CNY', '', '', 'date').filtered[0].id).toBe('recent')
  })
})
