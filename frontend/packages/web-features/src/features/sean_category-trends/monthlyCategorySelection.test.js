import { describe, expect, it } from 'vitest'
import { monthlyCategoryChildren, selectMonthlyCategoryRows } from './monthlyCategorySelection'

const category = (id, name, level = 1, parent_sync_id = null) => ({ id, name, level, kind: 'expense', parent_sync_id })
const row = (id, total) => ({ id, total })

describe('monthly category dropdown selection', () => {
  it('only offers children with a confirmed expense parent', () => {
    const categories = [category('p', '餐饮'), category('q', '购物'), category('c', '早餐', 2, 'p'),
      category('other', '早餐', 2, 'q'), category('orphan', '未同步', 2, 'missing'),
      { ...category('income', '收入', 2, 'p'), kind: 'income' }]
    expect(monthlyCategoryChildren(categories, 'p').map(item => item.id)).toEqual(['c'])
    expect(monthlyCategoryChildren(categories, '__all')).toEqual([])
  })
  it('uses unique legacy parent names without guessing or overriding supplied IDs', () => {
    const parents = [category('p', '餐饮'), category('q', '购物')]
    const child = { ...category('c', '早餐', 2), parent_name: '餐饮' }
    expect(monthlyCategoryChildren([...parents, child], 'p')).toHaveLength(1)
    expect(monthlyCategoryChildren([...parents, category('dup', '餐饮'), child], 'p')).toEqual([])
    expect(monthlyCategoryChildren([...parents, { ...child, parent_sync_id: 'missing' }], 'p')).toEqual([])
  })
  it('selects parent totals, individual leaves, and direct parent transactions separately', () => {
    const parents = [row('p', 30), row('q', 40)]
    const leaves = [row('p', 10), row('c', 20), row('q', 40)]
    expect(selectMonthlyCategoryRows(leaves, parents, leaves, '__all', '__all')).toEqual(leaves)
    expect(selectMonthlyCategoryRows(leaves, parents, leaves, 'p', '__all')).toEqual([row('p', 30)])
    expect(selectMonthlyCategoryRows(leaves, parents, leaves, 'p', 'c')).toEqual([row('c', 20)])
    expect(selectMonthlyCategoryRows(leaves, parents, leaves, 'p', '__direct')).toEqual([row('p', 10)])
    expect(selectMonthlyCategoryRows(leaves, parents, leaves, 'p', 'empty')).toEqual([])
    expect(selectMonthlyCategoryRows(leaves, parents, leaves, 'missing', 'c')).toEqual(leaves)
  })
})
