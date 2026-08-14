import { describe, expect, it } from 'vitest'

import { buildCategoryDisplayCounts } from './categoryDisplayCounts'

const row = (id, name, kind = 'expense', parentName = null) => ({
  id,
  name,
  kind,
  parent_name: parentName,
})

describe('buildCategoryDisplayCounts', () => {
  it('adds child counts to the parent while preserving leaf counts', () => {
    const rows = [
      row('parent', '餐饮'),
      row('breakfast', '早餐', 'expense', '餐饮'),
      row('dinner', '晚餐', 'expense', '餐饮'),
    ]

    expect(buildCategoryDisplayCounts(rows, {
      parent: 2,
      breakfast: 3,
      dinner: 4,
    })).toEqual({
      parent: 9,
      breakfast: 3,
      dinner: 4,
    })
  })

  it('matches parent names case-insensitively but keeps kinds isolated', () => {
    const rows = [
      row('expense-parent', 'Food'),
      row('income-parent', 'Food', 'income'),
      row('expense-child', 'Lunch', 'expense', ' food '),
      row('income-child', 'Bonus', 'income', 'FOOD'),
    ]

    expect(buildCategoryDisplayCounts(rows, {
      'expense-child': 5,
      'income-child': 7,
    })).toMatchObject({
      'expense-parent': 5,
      'income-parent': 7,
    })
  })

  it('does not assign orphan child counts to another parent', () => {
    const rows = [
      row('parent', '餐饮'),
      row('orphan', '地铁', 'expense', '交通'),
    ]

    expect(buildCategoryDisplayCounts(rows, { orphan: 6 })).toEqual({
      parent: 0,
      orphan: 6,
    })
  })
})
