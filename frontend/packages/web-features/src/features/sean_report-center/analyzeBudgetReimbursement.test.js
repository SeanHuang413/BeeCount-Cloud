import { describe, expect, it } from 'vitest'
import { analyzeBudgetReimbursement, hasOverlappingBudgetExpenses } from './analyzeBudgetReimbursement'

describe('budget reimbursement analysis', () => {
  it('detects overlapping parent and child budget expenses before displaying a total', () => {
    expect(hasOverlappingBudgetExpenses([{ expenseTransactions: [{ id: 'same' }] }, { expenseTransactions: [{ id: 'same' }] }])).toBe(true)
    expect(hasOverlappingBudgetExpenses([{ expenseTransactions: [{ id: 'first' }] }, { expenseTransactions: [{ id: 'second' }] }])).toBe(false)
  })
  it('does not compare calendar-month spending with weekly, annual or shifted monthly limits', () => {
    const categories = [{ id: 'food', name: '餐饮', kind: 'expense' }]
    const budget = { type: 'category', enabled: true, category_id: 'food', amount: 1000 }
    const budgets = [{ ...budget, id: 'month', period: 'monthly', start_day: 1 }, { ...budget, id: 'week', period: 'weekly' }, { ...budget, id: 'year', period: 'yearly' }, { ...budget, id: 'shift', period: 'monthly', start_day: 15 }]
    expect(analyzeBudgetReimbursement(budgets, categories, []).map((row) => row.id)).toEqual(['month'])
  })
  it('uses category identities and stable parent links after renames', () => {
    const categories = [
      { id: 'food', name: '餐饮', kind: 'expense' },
      { id: 'meal', name: '午餐', kind: 'expense', parent_sync_id: 'food', parent_name: '旧父级' },
      { id: 'other', name: '午餐', kind: 'expense' },
      { id: 'income-food', name: '餐饮', kind: 'income' },
      { id: 'refund', name: '餐饮报销', kind: 'income', parent_sync_id: 'income-food', parent_name: '旧名称' },
    ]
    const budgets = [{ id: 'b', type: 'category', enabled: true, category_id: 'food', amount: 1000 }]
    const transactions = [
      { id: 'a', tx_type: 'expense', category_id: 'meal', category_name: '旧子级', amount: 200 },
      { id: 'b', tx_type: 'expense', category_id: 'other', category_name: '午餐', amount: 999 },
      { id: 'c', tx_type: 'income', category_id: 'refund', category_name: '旧报销', amount: 50 },
    ]
    expect(analyzeBudgetReimbursement(budgets, categories, transactions)[0]).toMatchObject({ expense: 200, reimbursement: 50, actual: 150 })
  })
  it('only offsets matching reimbursement child income and keeps detail rows', () => {
    const budgets = [{ id: 'b1', type: 'category', enabled: true, category_id: 'food', category_name: '餐饮', amount: 1000 }]
    const categories = [{ id: 'food', name: '餐饮', kind: 'expense' }, { id: 'meal', name: '工作餐', kind: 'expense', parent_name: '餐饮' }, { id: 'refund', name: '餐饮报销', kind: 'income', parent_name: '餐饮' }, { id: 'salary', name: '工资', kind: 'income' }]
    const transactions = [{ id: 'e1', tx_type: 'expense', amount: 600, category_name: '工作餐' }, { id: 'r1', tx_type: 'income', amount: 200, category_name: '餐饮报销' }, { id: 'i1', tx_type: 'income', amount: 999, category_name: '工资' }]
    const row = analyzeBudgetReimbursement(budgets, categories, transactions)[0]
    expect(row).toMatchObject({ expense: 600, reimbursement: 200, actual: 400, remaining: 600, usageRate: 0.4 })
    expect(row.expenseTransactions.map((tx) => tx.id)).toEqual(['e1'])
    expect(row.reimbursementTransactions.map((tx) => tx.id)).toEqual(['r1'])
  })
  it('shares family reimbursement across groceries and happy dining without double counting', () => {
    const budgets = [
      { id: 'b1', type: 'category', enabled: true, category_id: 'groceries', amount: 1000 },
      { id: 'b2', type: 'category', enabled: true, category_id: 'dining', amount: 1000 },
    ]
    const categories = [
      { id: 'groceries', name: '买菜', kind: 'expense' },
      { id: 'dining', name: '幸福聚餐', kind: 'expense' },
      { id: 'happy-refund', name: '幸福报销', kind: 'income' },
      { id: 'family-refund', name: '家庭报销', kind: 'income', parent_name: '幸福报销' },
    ]
    const transactions = [
      { id: 'e1', tx_type: 'expense', amount: 600, category_name: '买菜' },
      { id: 'e2', tx_type: 'expense', amount: 400, category_name: '幸福聚餐' },
      { id: 'r1', tx_type: 'income', amount: 500, category_name: '家庭报销' },
    ]
    const rows = analyzeBudgetReimbursement(budgets, categories, transactions)
    expect(rows.find((row) => row.name === '买菜')).toMatchObject({ expense: 600, reimbursement: 300, actual: 300 })
    expect(rows.find((row) => row.name === '幸福聚餐')).toMatchObject({ expense: 400, reimbursement: 200, actual: 200 })
    expect(rows.reduce((sum, row) => sum + row.reimbursement, 0)).toBe(500)
  })
})
