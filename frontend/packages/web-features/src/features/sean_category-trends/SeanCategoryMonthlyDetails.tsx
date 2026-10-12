import { TrendHelp } from './TrendHelp'
import type { WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@beecount/ui'
import { type CategoryTrend, type TrendBucket } from './analyzeCategoryTrends'
import { selectMonthlyCategoryRows } from './monthlyCategorySelection'
import { CategoryTrendSelect, useCategoryTrendSelection } from './CategoryTrendSelect'

export function SeanCategoryMonthlyDetails({ rows, parentRows, leafRows, categories, monthKeys, currentMonth, format, onDetails }: {
  rows: CategoryTrend[]
  parentRows: CategoryTrend[]
  leafRows: CategoryTrend[]
  categories: WorkspaceCategory[]
  monthKeys: string[]
  currentMonth: string
  format: (amount: number) => string
  onDetails: (title: string, items: WorkspaceTransaction[], context?: { row: CategoryTrend; month?: string }) => void
}) {
  const selection = useCategoryTrendSelection(parentRows, categories)
  const visibleRows = selectMonthlyCategoryRows(rows, parentRows, leafRows, selection.parentId, selection.childId).filter(row => row.total > 0)
  const months = [...monthKeys].reverse()
  const label = (month: string) => `${month}${month === currentMonth ? '（未结束）' : ''}`
  const openMonth = (row: CategoryTrend, month: string) => onDetails(`${row.name} · ${month}`, row.items, { row, month })
  const difference = (item: TrendBucket) => <span className={`mt-1 block text-xs ${item.monthDelta > 0 ? 'text-red-600 dark:text-red-400' : item.monthDelta < 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
    较上月 {item.monthDelta === 0 ? '持平' : `${item.monthDelta > 0 ? '+' : '−'}${format(Math.abs(item.monthDelta))}`}
    {item.month === currentMonth && <span className="block text-muted-foreground">截至目前</span>}
  </span>
  return <Card>
    <CardHeader><CardTitle className="flex items-center justify-between gap-2">各分类月度对比<TrendHelp label="月度对比说明" text="按期间合计排序。各月与前一个自然月全月比较，红增绿减；当前月仅截至目前，不表示整月节省。此表不受对比月份及同期选项影响。点击月份金额或期间合计查看明细。" /></CardTitle><CardDescription>{monthKeys[0]} 至 {monthKeys[monthKeys.length - 1]} · 近 {monthKeys.length} 个月</CardDescription></CardHeader>
    <CardContent>
      <div className="mb-4 space-y-2"><CategoryTrendSelect selection={selection} categories={categories} label="月度对比" /><p className="text-xs text-muted-foreground">{visibleRows.length} 个分类</p></div>
      <div className="space-y-3 md:hidden">{visibleRows.map(row => <div key={row.id} className="rounded-lg border p-3">
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 break-words text-sm font-medium">{row.name}</span>
          <button type="button" className="shrink-0 text-right hover:underline" onClick={() => onDetails(`${row.name} · 近 ${monthKeys.length} 个月`, row.items, { row })}>
            <span className="block text-xs text-muted-foreground">期间合计 · {row.items.length} 笔</span>
            <span className="font-mono text-sm text-expense">{format(row.total)}</span>
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">{months.map(month => {
          const item = row.months.find(item => item.month === month)!
          return <button key={month} type="button" aria-label={`${row.name} ${month} 支出明细`} className="min-w-0 rounded-md bg-muted/30 p-2 text-left hover:bg-muted/60" onClick={() => openMonth(row, month)}>
            <span className="block text-xs text-muted-foreground">{label(month)}</span>
            <span className="block break-all font-mono text-sm text-expense">{format(item.amount)}</span>
            <span className="text-xs text-muted-foreground">{item.count} 笔</span>
            {difference(item)}
          </button>
        })}</div>
      </div>)}</div>
      <div className="hidden max-h-[65vh] overflow-auto md:block"><Table>
        <TableHeader><TableRow><TableHead className="sticky left-0 top-0 z-30 min-w-32 bg-card">分类</TableHead><TableHead className="sticky top-0 z-20 min-w-28 bg-card text-right">期间合计</TableHead>
          {months.map(month => <TableHead key={month} className="sticky top-0 z-20 min-w-28 bg-card text-right">{label(month)}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>{visibleRows.map(row => <TableRow key={row.id}>
          <TableCell className="sticky left-0 z-10 bg-card font-medium">{row.name}</TableCell>
          <TableCell className="text-right"><button type="button" className="hover:underline" onClick={() => onDetails(`${row.name} · 近 ${monthKeys.length} 个月`, row.items, { row })}>
            <span className="block font-mono text-expense">{format(row.total)}</span><span className="text-xs text-muted-foreground">{row.items.length} 笔</span>
          </button></TableCell>
          {months.map(month => {
            const item = row.months.find(item => item.month === month)!
            return <TableCell key={month} className="text-right"><button type="button" aria-label={`${row.name} ${month} 支出明细`} className="hover:underline" onClick={() => openMonth(row, month)}>
              <span className="block font-mono text-expense">{format(item.amount)}</span><span className="text-xs text-muted-foreground">{item.count} 笔</span>
              {difference(item)}
            </button></TableCell>
          })}
        </TableRow>)}</TableBody>
      </Table></div>
      {!visibleRows.length && <p className="py-5 text-center text-sm text-muted-foreground">所选分类在当前趋势范围没有支出。</p>}
    </CardContent>
  </Card>
}
