import type { WorkspaceTransaction } from '@beecount/api-client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@beecount/ui'

export type SeanReportDetailKind = 'tag' | 'merchant' | 'income' | 'category'
export type SeanReportDetailSelection = { kind: SeanReportDetailKind; name: string; categoryNames?: string[] } | null

type Props = { selection: SeanReportDetailSelection; transactions: WorkspaceTransaction[]; currency: string; onOpenChange: (open: boolean) => void }

function money(value: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}

function amountOf(tx: WorkspaceTransaction): number { return Math.abs(Number(tx.native_amount ?? tx.amount) || 0) }
function tagsOf(tx: WorkspaceTransaction): string[] { return tx.tags_list?.filter(Boolean) || (tx.tags || '').split(',').map((name) => name.trim()).filter(Boolean) }
function label(kind: SeanReportDetailKind): string { return kind === 'tag' ? '标签' : kind === 'merchant' ? '高频消费' : kind === 'income' ? '收入来源' : '分类消费' }

function matches(tx: WorkspaceTransaction, selection: Exclude<SeanReportDetailSelection, null>): boolean {
  if (tx.exclude_from_stats || !['expense', 'income'].includes(tx.tx_type) || amountOf(tx) <= 0) return false
  if (selection.kind === 'tag') return tagsOf(tx).includes(selection.name)
  if (selection.kind === 'category') return tx.tx_type === 'expense' && (selection.categoryNames || [selection.name]).includes((tx.category_name || '').trim())
  const name = (tx.note || tx.category_name || '').trim()
  return selection.kind === 'merchant' ? tx.tx_type === 'expense' && name === selection.name : tx.tx_type === 'income' && name === selection.name
}

export function SeanReportDetailsDialog({ selection, transactions, currency, onOpenChange }: Props) {
  const rows = selection ? transactions.filter((tx) => matches(tx, selection)).sort((a, b) => b.happened_at.localeCompare(a.happened_at)) : []
  const summary = rows.reduce((total, tx) => {
    if (tx.tx_type === 'income') total.income += amountOf(tx)
    if (tx.tx_type === 'expense') total.expense += amountOf(tx)
    return total
  }, { income: 0, expense: 0 })
  const balance = summary.income - summary.expense

  return <Dialog open={Boolean(selection)} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[80vh] max-w-xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{selection ? `${label(selection.kind)}：${selection.name}` : '报表明细'}</DialogTitle>
        <DialogDescription>仅显示当前报表时间范围内、已计入统计的交易。</DialogDescription>
      </DialogHeader>
      {rows.length ? <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm sm:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">总笔数</p><p className="mt-1 font-mono font-semibold">{rows.length}</p></div>
        <div><p className="text-xs text-muted-foreground">总收入</p><p className="mt-1 font-mono font-semibold text-income">+{money(summary.income, currency)}</p></div>
        <div><p className="text-xs text-muted-foreground">总支出</p><p className="mt-1 font-mono font-semibold text-expense">-{money(summary.expense, currency)}</p></div>
        <div><p className="text-xs text-muted-foreground">净结余</p><p className={`mt-1 font-mono font-semibold ${balance >= 0 ? 'text-income' : 'text-expense'}`}>{balance >= 0 ? '+' : ''}{money(balance, currency)}</p></div>
      </div> : null}
      <div className="divide-y divide-border/70">
        {rows.map((tx) => {
          const expense = tx.tx_type === 'expense'
          return <div key={tx.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate font-medium">{tx.note || tx.category_name || '未命名交易'}</p><p className="mt-1 text-xs text-muted-foreground">{tx.happened_at.slice(0, 10)}{tagsOf(tx).length ? ` · ${tagsOf(tx).join('、')}` : ''}</p></div><span className={`shrink-0 font-mono font-semibold ${expense ? 'text-expense' : 'text-income'}`}>{expense ? '-' : '+'}{money(amountOf(tx), currency)}</span></div>
        })}
        {!rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">没有符合条件的交易。</p> : null}
      </div>
    </DialogContent>
  </Dialog>
}
