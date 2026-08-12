import type { ReadBudget, WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beecount/ui'
import { ReceiptText } from 'lucide-react'

type Props = { budgets: ReadBudget[]; categories: WorkspaceCategory[]; transactions: WorkspaceTransaction[]; currency: string }

function amountOf(tx: WorkspaceTransaction): number {
  const amount = Number(tx.native_amount ?? tx.amount)
  return Number.isFinite(amount) ? Math.abs(amount) : 0
}

function money(value: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}

/**
 * Cloud-only, read-only view. A reimbursement is an income child category whose
 * name contains “报销” under the same parent name as an expense budget category.
 * It never changes the official budget usage or any synced transaction.
 */
export function BudgetReimbursementCard({ budgets, categories, transactions, currency }: Props) {
  const rows = budgets.filter((budget) => budget.type === 'category' && budget.enabled).map((budget) => {
    const parent = categories.find((category) => category.id === budget.category_id)?.name || budget.category_name || ''
    const expenseNames = new Set(categories.filter((category) => category.kind === 'expense' && (category.name === parent || category.parent_name === parent)).map((category) => category.name))
    const reimbursementNames = new Set(categories.filter((category) => category.kind === 'income' && category.parent_name === parent && /报销|reimburs/i.test(category.name)).map((category) => category.name))
    let expense = 0
    let reimbursement = 0
    for (const tx of transactions) {
      if (tx.exclude_from_stats || amountOf(tx) <= 0) continue
      const name = (tx.category_name || '').trim()
      if (tx.tx_type === 'expense' && expenseNames.has(name)) expense += amountOf(tx)
      if (tx.tx_type === 'income' && reimbursementNames.has(name)) reimbursement += amountOf(tx)
    }
    return { id: budget.id, name: parent || '未命名预算分类', budget: budget.amount, expense, reimbursement, actual: Math.max(0, expense - reimbursement), remaining: budget.amount - Math.max(0, expense - reimbursement), hasReimbursementCategory: reimbursementNames.size > 0 }
  }).sort((a, b) => b.actual - a.actual)

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />预算与报销对冲</CardTitle>
      <CardDescription>只读计算：支出减去同名预算分类下、二级分类名称含“报销”的收入；不改变官方预算已用金额。</CardDescription>
    </CardHeader>
    <CardContent>
      {rows.length ? <div className="divide-y divide-border/70">{rows.map((row) => <div key={row.id} className="py-3">
        <div className="flex items-center justify-between gap-3"><span className="font-medium">{row.name}</span><span className={row.remaining >= 0 ? 'font-mono text-income' : 'font-mono text-expense'}>剩余 {money(row.remaining, currency)}</span></div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4"><span className="text-muted-foreground">预算 <b className="font-mono text-foreground">{money(row.budget, currency)}</b></span><span className="text-muted-foreground">支出 <b className="font-mono text-expense">-{money(row.expense, currency)}</b></span><span className="text-muted-foreground">报销 <b className="font-mono text-income">+{money(row.reimbursement, currency)}</b></span><span className="text-muted-foreground">实际承担 <b className="font-mono text-foreground">{money(row.actual, currency)}</b></span></div>
        {!row.hasReimbursementCategory ? <p className="mt-2 text-xs text-muted-foreground">尚未找到该分类下名称含“报销”的收入二级分类。</p> : null}
      </div>)}</div> : <p className="py-6 text-sm text-muted-foreground">请先在官方预算中设置分类预算。</p>}
    </CardContent>
  </Card>
}
