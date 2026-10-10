import { describe, expect, it } from 'vitest'
import { analyzeCategoryTrends } from './analyzeCategoryTrends'

const date = (month, day, hour = 10) => new Date(2026, month - 1, day, hour)
const tx = (id, month, day, overrides = {}) => ({ id, tx_type: 'expense', amount: 100,
  category_id: 'leaf', category_name: '买菜', currency_code: 'CNY',
  happened_at: date(month, day).toISOString(), ...overrides })
const categories = [
  { id: 'parent', name: '生活', kind: 'expense', level: 1, parent_name: null },
  { id: 'leaf', name: '买菜', kind: 'expense', level: 2, parent_name: '生活', parent_sync_id: 'parent' },
]
const options = { currency: 'CNY', months: 3, level: 'parent', comparisonMonth: '2026-10',
  samePeriod: true, now: date(10, 10, 12) }
const analyze = (items, overrides = {}, cats = categories) => analyzeCategoryTrends(items, cats, { ...options, ...overrides })

describe('category spending trends', () => {
  it('shows adjacent-month differences including the hidden baseline, without adding it to period totals', () => {
    const result = analyze([tx('baseline', 7, 31, { amount: 100 }), tx('august', 8, 20, { amount: 150 }),
      tx('september', 9, 30, { amount: 120 }), tx('october', 10, 2, { amount: 120 })])
    expect(result.rows[0].months.map(item => item.monthDelta)).toEqual([50, -30, 0])
    expect(result.all.months.map(item => item.monthDelta)).toEqual([50, -30, 0])
    expect(result.rows[0].total).toBe(390)
    expect(result.rows[0].items.map(item => item.id)).toEqual(['august', 'september', 'october'])
    expect(result.rows[0].baseline.amount).toBe(100)
    expect(result.all.previous.amount).toBe(0)
  })

  it('uses zero-spending calendar months instead of skipping gaps', () => {
    const result = analyze([tx('august', 8, 2, { amount: 200 }), tx('october', 10, 2, { amount: 50 })])
    expect(result.rows[0].months.map(item => item.monthDelta)).toEqual([200, -200, 50])
  })

  it('handles cross-year month differences and avoids fractional-cent false changes', () => {
    const result = analyze([
      tx('baseline', 10, 31, { happened_at: new Date(2025, 9, 31, 12).toISOString(), amount: 0.3 }),
      tx('november-a', 11, 2, { happened_at: new Date(2025, 10, 2, 12).toISOString(), amount: 0.1 }),
      tx('november-b', 11, 3, { happened_at: new Date(2025, 10, 3, 12).toISOString(), amount: 0.2 }),
      tx('december', 12, 2, { happened_at: new Date(2025, 11, 2, 12).toISOString(), amount: 1.3 }),
      tx('january', 1, 2, { amount: 0.3 }),
    ], { now: date(1, 10, 12), comparisonMonth: '2026-01' })
    expect(result.rows[0].months.map(item => item.monthDelta)).toEqual([0, 1, -1])
  })
  it.each([[3, 60], [6, 90], [12, 100]])('builds %i complete monthly columns independently of the comparison period', (months, total) => {
    const items = [tx('april', 4, 1, { amount: 10 }), tx('july', 7, 31, { amount: 30 }),
      tx('late-september', 9, 30, { amount: 40 }), tx('october', 10, 2, { amount: 20 })]
    const full = analyze(items, { months, samePeriod: false })
    const partial = analyze(items, { months, samePeriod: true })
    const historical = analyze(items, { months, comparisonMonth: '2026-09' })
    expect(full.rows[0].months).toHaveLength(months)
    expect(full.rows[0].total).toBe(total)
    expect(full.rows[0].months.reduce((sum, item) => sum + item.amount, 0)).toBe(total)
    expect(full.rows[0].months.reduce((sum, item) => sum + item.count, 0)).toBe(full.rows[0].items.length)
    expect(partial.rows[0].months).toEqual(full.rows[0].months)
    expect(historical.rows[0].months).toEqual(full.rows[0].months)
    expect(full.rows[0].months.find(item => item.month === '2026-09')).toMatchObject({ amount: 40, count: 1 })
  })
  it('includes the entire previous month in full-month mode, including its last instant', () => {
    const result = analyze([
      tx('first', 9, 1, { happened_at: new Date(2026, 8, 1).toISOString(), amount: 10 }),
      tx('late', 9, 20, { amount: 20 }),
      tx('last', 9, 30, { happened_at: new Date(2026, 8, 30, 23, 59, 59, 999).toISOString(), amount: 30 }),
      tx('current', 10, 1, { happened_at: new Date(2026, 9, 1).toISOString(), amount: 40 }),
    ], { samePeriod: false })
    expect(result.all.previous).toMatchObject({ amount: 60, count: 3 })
    expect(result.all.previousItems.map(item => item.id)).toEqual(['first', 'late', 'last'])
    expect(result.all.current).toMatchObject({ amount: 40, count: 1 })
    expect(result.all.months[1].amount).toBe(result.all.previous.amount)
  })

  it('compares January to the whole preceding December across years', () => {
    const result = analyze([
      tx('december', 12, 31, { happened_at: new Date(2025, 11, 31, 23, 59).toISOString(), amount: 75 }),
      tx('january', 1, 2, { amount: 25 }),
    ], { now: date(1, 10, 12), comparisonMonth: '2026-01', samePeriod: false })
    expect(result.all.previous).toMatchObject({ month: '2025-12', amount: 75, count: 1 })
    expect(result.all.current.amount).toBe(25)
  })
  it('rolls up direct parent and child spending without double counting', () => {
    const result = analyze([tx('1', 10, 2), tx('2', 10, 3, { category_id: 'parent', category_name: '生活', amount: 50 })])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ id: 'parent', total: 150, current: { amount: 150, count: 2, average: 75 } })
    expect(result.all.total).toBe(150)
    expect(result.all.months.map((row) => row.month)).toEqual(['2026-08', '2026-09', '2026-10'])
  })

  it('separates direct categories in leaf mode and leaves unresolved hierarchy visible', () => {
    const result = analyze([tx('1', 10, 2), tx('2', 10, 3, { category_id: 'parent', category_name: '生活' }),
      tx('3', 10, 4, { category_id: 'orphan', category_name: '孤儿分类' })], { level: 'leaf' })
    expect(result.rows.map((row) => row.name)).toEqual(expect.arrayContaining(['生活 / 买菜', '生活', '孤儿分类']))
    expect(result.all.current.count).toBe(3)
  })

  it('uses stable category IDs after renames and does not guess ambiguous names', () => {
    const renamed = categories.map((category) => category.id === 'parent' ? { ...category, name: '家庭生活' } : category)
    expect(analyze([tx('1', 10, 2)], {}, renamed).rows[0].name).toBe('家庭生活')
    const ambiguous = [...categories, { ...categories[1], id: 'other', parent_sync_id: null, parent_name: null }]
    const result = analyze([tx('1', 10, 2, { category_id: null }), tx('2', 10, 3, { category_id: 'deleted' })], {}, ambiguous)
    expect(result.rows.map((row) => row.id)).toEqual(expect.arrayContaining(['name:买菜', 'missing:deleted']))
  })

  it('compares current month to the same date and time, retaining full-month trend totals', () => {
    const result = analyze([tx('1', 9, 2), tx('2', 9, 20, { amount: 300 }), tx('3', 10, 2, { amount: 150 }),
      tx('4', 9, 10, { happened_at: date(9, 10, 13).toISOString(), amount: 200 })])
    expect(result.all.current.amount).toBe(150)
    expect(result.all.previous.amount).toBe(100)
    expect(result.all.delta).toBe(50)
    expect(result.all.change).toBe(0.5)
    expect(result.all.months[1].amount).toBe(600)
    expect(result.all.previousItems.map((item) => item.id)).toEqual(['1'])
    expect(analyze([tx('1', 9, 2), tx('2', 9, 20)], { samePeriod: false }).all.previous.amount).toBe(200)
  })

  it('compares complete historical months including the extra baseline month', () => {
    const result = analyze([tx('1', 7, 31, { amount: 200 }), tx('2', 8, 31, { amount: 100 })], { comparisonMonth: '2026-08' })
    expect(result.samePeriod).toBe(false)
    expect(result.all.previous.amount).toBe(200)
    expect(result.all.current.amount).toBe(100)
    expect(result.all.total).toBe(100)
    expect(result.all.delta).toBe(-100)
  })

  it('clips the prior period to month end without spilling into the current month', () => {
    const result = analyze([tx('1', 2, 28), tx('2', 3, 1, { amount: 200 })], {
      now: date(3, 31, 12), comparisonMonth: '2026-03',
    })
    expect(result.all.previous.amount).toBe(100)
    expect(result.all.current.amount).toBe(200)
  })

  it('excludes transfers, income, excluded statistics, invalid dates and future records', () => {
    const result = analyze([tx('valid', 10, 2), tx('transfer', 10, 3, { tx_type: 'transfer' }),
      tx('income', 10, 3, { tx_type: 'income' }), tx('excluded', 10, 3, { exclude_from_stats: true }),
      tx('invalid', 10, 3, { happened_at: 'not a date' }), tx('future', 10, 20), tx('zero', 10, 3, { amount: 0 })])
    expect(result.all.items.map((item) => item.id)).toEqual(['valid'])
  })

  it('uses saved base-currency amounts and reports missing foreign snapshots', () => {
    const result = analyze([tx('foreign', 10, 2, { amount: 10, currency_code: 'USD', native_amount: 72 }),
      tx('missing', 10, 3, { amount: 10, currency_code: 'USD' }), tx('legacy', 10, 3, { currency_code: null })])
    expect(result.all.current).toMatchObject({ amount: 172, count: 2, average: 86 })
    expect(result.ignoredCurrencies).toEqual(['USD'])
    expect(result.ignoredCount).toBe(1)
    expect(result.all.items.map((item) => item.id)).toEqual(['foreign', 'legacy'])
  })

  it('keeps new and disappeared spending comparable without inventing an infinite percentage', () => {
    const fresh = analyze([tx('new', 10, 2)])
    expect(fresh.all.delta).toBe(100)
    expect(fresh.all.change).toBeNull()
    const gone = analyze([tx('old', 9, 2)])
    expect(gone.rows[0].change).toBe(-1)
    expect(gone.rows[0].current.count).toBe(0)
    expect(analyze([]).all.months).toHaveLength(3)
  })
})
