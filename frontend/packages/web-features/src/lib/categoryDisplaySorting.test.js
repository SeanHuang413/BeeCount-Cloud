import { describe, expect, it } from 'vitest'

import { compareCategoriesForDisplay } from './categoryDisplaySorting'

const category = (id, name, sortOrder = null) => ({
  id,
  name,
  kind: 'expense',
  parent_name: null,
  sort_order: sortOrder,
})

describe('compareCategoriesForDisplay', () => {
  it('keeps manually ordered categories ahead of automatic categories', () => {
    const rows = [category('auto', 'Auto'), category('manual', 'Manual', 5)]
    expect(rows.sort((a, b) => compareCategoriesForDisplay(a, b, { auto: 99 }, { auto: 999 })))
      .toEqual([category('manual', 'Manual', 5), category('auto', 'Auto')])
  })

  it('sorts automatic categories by count, then amount, then name', () => {
    const rows = [category('a', 'Zulu'), category('b', 'Beta'), category('c', 'Alpha')]
    const counts = { a: 2, b: 3, c: 3 }
    const amounts = { a: 1000, b: 10, c: 20 }
    expect(rows.sort((a, b) => compareCategoriesForDisplay(a, b, counts, amounts)).map((row) => row.id))
      .toEqual(['c', 'b', 'a'])
  })
})
