import { useState } from 'react'
import type { ReadBudget, WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent,
  DialogDescription, DialogHeader, DialogTitle,
} from '@beecount/ui'
import { ReceiptText } from 'lucide-react'
import { analyzeBudgetReimbursement, type BudgetReimbursementRow } from './analyzeBudgetReimbursement'

type Props = { budgets: ReadBudget[]; categories: WorkspaceCategory[]; transactions: WorkspaceTransaction[]; currency: string }
type Detail = { row: BudgetReimbursementRow; kind: 'expense' | 'reimbursement' } | null

function amountOf(tx: WorkspaceTransaction): number { return Math.abs(Number(tx.native_amount ?? tx.amount) || 0) }
function money(value: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}

export function BudgetReimbursementCard({ budgets, categories, transactions, currency }: Props) {
  const rows = analyzeBudgetReimbursement(budgets, categories, transactions)
  const [detail, setDetail] = useState<Detail>(null)
  const totals = rows.reduce(
    (sum, row) => ({ budget: sum.budget + row.budget, expense: sum.expense + row.expense, reimbursement: sum.reimbursement + row.reimbursement, actual: sum.actual + row.actual }),
    { budget: 0, expense: 0, reimbursement: 0, actual: 0 },
  )
  const detailRows = detail ? (detail.kind === 'expense' ? detail.row.expenseTransactions : detail.row.reimbursementTransactions) : []

  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">分类预算</p><p className="mt-1 font-mono text-xl font-semibold">{money(totals.budget, currency)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">支出</p><p className="mt-1 font-mono text-xl font-semibold text-expense">-{money(totals.expense, currency)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">报销</p><p className="mt-1 font-mono text-xl font-semibold text-income">+{money(totals.reimbursement, currency)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">实际承担</p><p className="mt-1 font-mono text-xl font-semibold">{money(totals.actual, currency)}</p><p className="mt-1 text-xs text-muted-foreground">预算执行率 {totals.budget > 0 ? `${(totals.actual / totals.budget * 100).toFixed(1)}%` : '—'}</p></CardContent></Card>
    </div>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />预算与报销对冲</CardTitle>
        <CardDescription>只读计算：一般报销按同名预算分类匹配；“幸福报销 / 家庭报销”按当月支出占比分摊给“买菜”和“幸福聚餐”。超支时仅变色提示。</CardDescription>
      </CardHeader>
      <CardContent>{rows.length ? <div className="divide-y divide-border/70">{rows.map((row) =>
        <div key={row.id} className="py-3">
          <div className="flex items-center justify-between gap-3"><span className="font-medium">{row.name}</span><span className={row.remaining >= 0 ? 'font-mono' : 'font-mono text-expense'}>剩余 {money(row.remaining, currency)}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${row.usageRate > 1 ? 'bg-expense' : 'bg-primary'}`} style={{ width: `${Math.min(100, row.usageRate * 100)}%` }}/></div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <span className="text-muted-foreground">预算 <b className="font-mono text-foreground">{money(row.budget, currency)}</b></span>
            <button type="button" className="text-left text-muted-foreground hover:text-primary" onClick={() => setDetail({ row, kind: 'expense' })}>支出 <b className="font-mono text-expense">-{money(row.expense, currency)}</b></button>
            <button type="button" className="text-left text-muted-foreground hover:text-primary" onClick={() => setDetail({ row, kind: 'reimbursement' })}>报销 <b className="font-mono text-income">+{money(row.reimbursement, currency)}</b></button>
            <span className="text-muted-foreground">实际承担 <b className="font-mono text-foreground">{money(row.actual, currency)}</b></span>
          </div>
          {!row.hasReimbursementCategory ? <p className="mt-2 text-xs text-muted-foreground">尚未找到该分类对应的报销收入二级分类。</p> : null}
        </div>,
      )}</div> : <p className="py-6 text-sm text-muted-foreground">请先在预算中设置分类预算。</p>}</CardContent>
    </Card>
    <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null) }}>
      <DialogContent className="max-h-[80vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>{detail ? `${detail.row.name} · ${detail.kind === 'expense' ? '支出' : '报销'}明细` : '分类明细'}</DialogTitle><DialogDescription>仅显示当前月份和当前分类口径内的交易；共享报销明细显示原始报销池。</DialogDescription></DialogHeader>
        <div className="divide-y divide-border/70">{detailRows.slice().sort((a, b) => b.happened_at.localeCompare(a.happened_at)).map((tx) =>
          <div key={tx.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{tx.note || tx.category_name || '未命名交易'}</p><p className="mt-1 text-xs text-muted-foreground">{tx.happened_at.slice(0, 10)} · {tx.category_name || '未分类'}</p></div><span className={`font-mono font-semibold ${detail?.kind === 'expense' ? 'text-expense' : 'text-income'}`}>{detail?.kind === 'expense' ? '-' : '+'}{money(amountOf(tx), currency)}</span></div>,
        )}{!detailRows.length ? <p className="py-8 text-center text-sm text-muted-foreground">没有符合条件的交易。</p> : null}</div>
      </DialogContent>
    </Dialog>
  </>
}
