import { describe, expect, it } from 'vitest'

import { compareTagsForDisplay } from './tagDisplaySorting'

const tag = (id, name) => ({ id, name, color: null })

describe('compareTagsForDisplay', () => {
  it('sorts by count, expense, income, then name', () => {
    const rows = [tag('a', 'Zulu'), tag('b', 'Beta'), tag('c', 'Alpha'), tag('d', 'Delta')]
    const stats = {
      a: { count: 2, expense: 1000, income: 0 },
      b: { count: 3, expense: 10, income: 30 },
      c: { count: 3, expense: 20, income: 0 },
      d: { count: 3, expense: 10, income: 40 },
    }
    expect(rows.sort((a, b) => compareTagsForDisplay(a, b, stats)).map((row) => row.id))
      .toEqual(['c', 'd', 'b', 'a'])
  })
})
