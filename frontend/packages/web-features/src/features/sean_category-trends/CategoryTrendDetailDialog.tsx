import { useMemo, useState } from 'react'
import type { WorkspaceTransaction } from '@beecount/api-client'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@beecount/ui'
import { categoryDetailTransactions } from './detailTransactions'
import { trendExpenseAmount } from './analyzeCategoryTrends'

export type CategoryTrendDetail = {
  title: string
  items: WorkspaceTransaction[]
  categoryName?: string
  month?: string
  monthKeys?: string[]
}

export function CategoryTrendDetailDialog({ detail, currency, currentMonth, format, onClose }: {
  detail: CategoryTrendDetail; currency: string; currentMonth: string; format: (amount: number) => string; onClose: () => void
}) {
  const [month, setMonth] = useState(detail.month || '')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'date' | 'amount'>('date')
  const data = useMemo(() => categoryDetailTransactions(detail.items, currency, month, query, sort), [detail.items, currency, month, query, sort])
  const monthKeys = detail.monthKeys || []
  const index = monthKeys.indexOf(month)
  const selectStyle = 'h-9 max-w-full rounded-md border border-input bg-background px-2 text-sm'
  const title = detail.categoryName ? `${detail.categoryName} · ${month || `近 ${monthKeys.length} 个月`}` : detail.title
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent className="flex max-h-[82dvh] max-w-3xl flex-col overflow-hidden">
      <DialogHeader className="shrink-0"><DialogTitle>{title}</DialogTitle><DialogDescription>仅展示本报表纳入统计的支出。{month === currentMonth ? '本月未结束，金额截至数据更新时间。' : ''}</DialogDescription></DialogHeader>
      <div className="shrink-0 space-y-3 border-b pb-3">
        {monthKeys.length > 0 && <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" aria-label="查看上月明细" disabled={index <= 0} onClick={() => setMonth(monthKeys[index - 1])}>← 上月</Button>
          <label className="flex items-center gap-2 text-sm">明细月份<select className={selectStyle} value={month} onChange={event => setMonth(event.target.value)}><option value="">整个趋势期间</option>{[...monthKeys].reverse().map(key => <option key={key} value={key}>{key}{key === currentMonth ? '（未结束）' : ''}</option>)}</select></label>
          <Button variant="outline" size="sm" aria-label="查看下月明细" disabled={index < 0 || index >= monthKeys.length - 1} onClick={() => setMonth(monthKeys[index + 1])}>下月 →</Button>
        </div>}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-3 text-sm">
          <div><p className="text-xs text-muted-foreground">{month ? '当月' : '期间'}合计</p><p className="mt-1 break-all font-mono text-expense">{format(data.periodTotal)}</p></div>
          <div><p className="text-xs text-muted-foreground">笔数</p><p className="mt-1 font-mono">{data.period.length} 笔</p></div>
          <div><p className="text-xs text-muted-foreground">平均单笔</p><p className="mt-1 break-all font-mono">{format(data.period.length ? data.periodTotal / data.period.length : 0)}</p></div>
        </div>
        <div className="flex flex-wrap gap-2"><input aria-label="搜索交易备注" placeholder="搜索交易备注" className={`${selectStyle} min-w-0 flex-1`} value={query} onChange={event => setQuery(event.target.value)} /><label className="flex items-center gap-2 text-sm">排序<select className={selectStyle} value={sort} onChange={event => setSort(event.target.value as 'date' | 'amount')}><option value="date">最新优先</option><option value="amount">金额最大优先</option></select></label></div>
        {query.trim() && <p className="text-xs text-muted-foreground">筛选结果：{data.filtered.length} 笔 · {format(data.filteredTotal)}；上方汇总仍为所选期间全部交易。</p>}
      </div>
      <div className="min-h-0 overflow-y-auto overscroll-contain divide-y">{data.filtered.map(tx => <div key={tx.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{tx.note || tx.category_name || '未分类支出'}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(tx.happened_at).toLocaleString()} · {tx.category_name || '未分类'} · {tx.account_name || '未指定账户'}</p></div><span className="shrink-0 font-mono text-sm text-expense">−{format(trendExpenseAmount(tx, currency) ?? 0)}</span></div>)}{!data.filtered.length && <p className="py-8 text-center text-sm text-muted-foreground">{query.trim() ? '没有匹配备注的交易。' : '该期间没有符合条件的交易。'}</p>}</div>
    </DialogContent>
  </Dialog>
}
