import { describe, expect, it } from 'vitest'
import { analyzeCategoryStructure } from './analyzeCategoryStructure'
const parent = { id: 'p', name: '餐饮', kind: 'expense', level: 1 }
const child = { id: 'c', name: '午餐', kind: 'expense', level: 2, parent_sync_id: 'p', parent_name: '旧名称' }
const tx = (id, category_id, category_name, amount = 10) => ({ id, category_id, category_name, amount, tx_type: 'expense' })
describe('category structure identities', () => {
  it('rolls up stable IDs after renames, including direct parent spending exactly once', () => {
    const rows = analyzeCategoryStructure([tx('1', 'c', '旧子名称'), tx('2', 'p', '餐饮', 20)], [parent, child])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 'p', name: '餐饮', count: 2, expense: 30, children: [{ id: 'c', name: '午餐', count: 1, expense: 10 }] })
  })
  it('keeps identical names with distinct identities separate', () => {
    const rows = analyzeCategoryStructure([tx('1', 'p', '餐饮'), tx('2', 'other', '餐饮')], [parent, { ...parent, id: 'other' }])
    expect(rows).toHaveLength(2)
  })
  it('does not guess ambiguous legacy names or replace unknown IDs with names', () => {
    const rows = analyzeCategoryStructure([tx('1', null, '午餐'), tx('2', 'missing', '午餐')], [parent, child, { ...child, id: 'c2' }])
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.children.length === 0)).toBe(true)
  })
})
