import type { ReadBudget, WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'

export type BudgetReimbursementRow = {
  id: string
  name: string
  budget: number
  expense: number
  reimbursement: number
  actual: number
  remaining: number
  usageRate: number
  hasReimbursementCategory: boolean
  expenseTransactions: WorkspaceTransaction[]
  reimbursementTransactions: WorkspaceTransaction[]
}

function amountOf(tx: WorkspaceTransaction): number {
  const amount = Number(tx.native_amount ?? tx.amount)
  return Number.isFinite(amount) ? Math.abs(amount) : 0
}

export function analyzeBudgetReimbursement(
  budgets: ReadBudget[], categories: WorkspaceCategory[], transactions: WorkspaceTransaction[],
): BudgetReimbursementRow[] {
  const valid = transactions.filter((tx) => !tx.exclude_from_stats && amountOf(tx) > 0)
  const familyExpenseNames = new Set(['买菜', '幸福聚餐'])
  const familyReimbursementNames = new Set(categories
    .filter((category) => category.kind === 'income' && category.parent_name === '幸福报销' && category.name === '家庭报销')
    .map((category) => category.name))

  const drafts = budgets.filter((budget) => budget.type === 'category' && budget.enabled).map((budget) => {
    const parent = categories.find((category) => category.id === budget.category_id)?.name || budget.category_name || ''
    const expenseNames = new Set(categories.filter((category) => category.kind === 'expense' && (category.name === parent || category.parent_name === parent)).map((category) => category.name))
    const usesFamilyReimbursement = [...expenseNames].some((name) => familyExpenseNames.has(name))
    const reimbursementNames = usesFamilyReimbursement
      ? familyReimbursementNames
      : new Set(categories.filter((category) => category.kind === 'income' && category.parent_name === parent && /报销|reimburs/i.test(category.name)).map((category) => category.name))
    const expenseTransactions = valid.filter((tx) => tx.tx_type === 'expense' && expenseNames.has((tx.category_name || '').trim()))
    const reimbursementTransactions = valid.filter((tx) => tx.tx_type === 'income' && reimbursementNames.has((tx.category_name || '').trim()))
    const expense = expenseTransactions.reduce((sum, tx) => sum + amountOf(tx), 0)
    return { budget, parent, expense, expenseTransactions, reimbursementTransactions, usesFamilyReimbursement, hasReimbursementCategory: reimbursementNames.size > 0 }
  })

  const familyExpenseTotal = drafts.filter((row) => row.usesFamilyReimbursement).reduce((sum, row) => sum + row.expense, 0)
  const familyReimbursementTotal = valid
    .filter((tx) => tx.tx_type === 'income' && familyReimbursementNames.has((tx.category_name || '').trim()))
    .reduce((sum, tx) => sum + amountOf(tx), 0)

  return drafts.map(({ budget, parent, expense, expenseTransactions, reimbursementTransactions, usesFamilyReimbursement, hasReimbursementCategory }) => {
    const reimbursement = usesFamilyReimbursement
      ? (familyExpenseTotal > 0 ? familyReimbursementTotal * expense / familyExpenseTotal : 0)
      : reimbursementTransactions.reduce((sum, tx) => sum + amountOf(tx), 0)
    const actual = Math.max(0, expense - reimbursement)
    return { id: budget.id, name: parent || '未命名预算分类', budget: budget.amount, expense, reimbursement, actual, remaining: budget.amount - actual, usageRate: budget.amount > 0 ? actual / budget.amount : 0, hasReimbursementCategory, expenseTransactions, reimbursementTransactions }
  }).sort((a, b) => b.actual - a.actual)
}
