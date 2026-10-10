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

export function hasOverlappingBudgetExpenses(rows: BudgetReimbursementRow[]): boolean {
  const seen = new Set<string>()
  for (const row of rows) for (const tx of row.expenseTransactions) {
    if (seen.has(tx.id)) return true
    seen.add(tx.id)
  }
  return false
}

function amountOf(tx: WorkspaceTransaction): number {
  const amount = Number(tx.native_amount ?? tx.amount)
  return Number.isFinite(amount) ? Math.abs(amount) : 0
}

export function analyzeBudgetReimbursement(
  budgets: ReadBudget[], categories: WorkspaceCategory[], transactions: WorkspaceTransaction[],
): BudgetReimbursementRow[] {
  const valid = transactions.filter((tx) => !tx.exclude_from_stats && amountOf(tx) > 0)
  const parentName = (category: WorkspaceCategory) => category.parent_sync_id
    ? categories.find((parent) => parent.id === category.parent_sync_id && parent.kind === category.kind)?.name || ''
    : category.parent_name || ''
  const matches = (tx: WorkspaceTransaction, candidates: WorkspaceCategory[]) => {
    if (tx.category_id) return candidates.some((category) => category.id === tx.category_id)
    const named = categories.filter((category) => category.kind === tx.tx_type && category.name === tx.category_name?.trim())
    return named.length === 1 && candidates.some((category) => category.id === named[0].id)
  }
  const familyExpenseNames = new Set(['买菜', '幸福聚餐'])
  const familyReimbursementCategories = categories.filter((category) => category.kind === 'income' && parentName(category) === '幸福报销' && category.name === '家庭报销')

  // The view is a calendar-month comparison; weekly/yearly limits are not comparable.
  const drafts = budgets.filter((budget) => budget.type === 'category' && budget.enabled
    && (!budget.period || budget.period === 'monthly') && (!budget.start_day || budget.start_day === 1)).map((budget) => {
    const namedCategories = categories.filter((category) => category.kind === 'expense' && category.name === budget.category_name)
    const budgetCategory = budget.category_id
      ? categories.find((category) => category.id === budget.category_id && category.kind === 'expense')
      : namedCategories.length === 1 ? namedCategories[0] : undefined
    const parent = budgetCategory?.name || budget.category_name || ''
    const nameUnambiguous = categories.filter((category) => category.kind === 'expense' && category.name === parent).length === 1
    const expenseCategories = budgetCategory ? categories.filter((category) => category.kind === 'expense'
      && (category.id === budgetCategory.id || (category.parent_sync_id
        ? category.parent_sync_id === budgetCategory.id
        : category.parent_name === parent && nameUnambiguous))) : []
    const usesFamilyReimbursement = Boolean(budgetCategory && nameUnambiguous && familyExpenseNames.has(parent))
    const reimbursementCategories = usesFamilyReimbursement
      ? familyReimbursementCategories
      : budgetCategory && nameUnambiguous ? categories.filter((category) => category.kind === 'income' && parentName(category) === parent && /报销|reimburs/i.test(category.name)) : []
    const expenseTransactions = valid.filter((tx) => tx.tx_type === 'expense' && matches(tx, expenseCategories))
    const reimbursementTransactions = valid.filter((tx) => tx.tx_type === 'income' && matches(tx, reimbursementCategories))
    const expense = expenseTransactions.reduce((sum, tx) => sum + amountOf(tx), 0)
    return { budget, parent, expense, expenseTransactions, reimbursementTransactions, usesFamilyReimbursement, hasReimbursementCategory: reimbursementCategories.length > 0 }
  })

  const familyExpenseTotal = drafts.filter((row) => row.usesFamilyReimbursement).reduce((sum, row) => sum + row.expense, 0)
  const familyReimbursementTotal = valid
    .filter((tx) => tx.tx_type === 'income' && matches(tx, familyReimbursementCategories))
    .reduce((sum, tx) => sum + amountOf(tx), 0)

  return drafts.map(({ budget, parent, expense, expenseTransactions, reimbursementTransactions, usesFamilyReimbursement, hasReimbursementCategory }) => {
    const reimbursement = usesFamilyReimbursement
      ? (familyExpenseTotal > 0 ? familyReimbursementTotal * expense / familyExpenseTotal : 0)
      : reimbursementTransactions.reduce((sum, tx) => sum + amountOf(tx), 0)
    const actual = Math.max(0, expense - reimbursement)
    return { id: budget.id, name: parent || '未命名预算分类', budget: budget.amount, expense, reimbursement, actual, remaining: budget.amount - actual, usageRate: budget.amount > 0 ? actual / budget.amount : 0, hasReimbursementCategory, expenseTransactions, reimbursementTransactions }
  }).sort((a, b) => b.actual - a.actual)
}
