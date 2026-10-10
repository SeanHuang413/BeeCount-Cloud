import { useEffect, useMemo, useState } from 'react'
import type { WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent,
  DialogDescription, DialogHeader, DialogTitle } from '@beecount/ui'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SeanCategoryMonthlyDetails } from './SeanCategoryMonthlyDetails'
import { analyzeCategoryTrends, trendExpenseAmount, trendMonthKey, type CategoryTrend } from './analyzeCategoryTrends'

type Props = {
  transactions: WorkspaceTransaction[]
  categories: WorkspaceCategory[]
  currency: string
  now: Date
  loading: boolean
  error: boolean
  total: number
  truncated: boolean
  categoryTruncated: boolean
  onRefresh: () => void
}
function money(value: number, currency: string) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}
function change(row: CategoryTrend) {
  return row.change === null ? row.current.amount > 0 ? '此前无支出' : '—' : `${row.change > 0 ? '+' : ''}${(row.change * 100).toFixed(1)}%`
}
const selectStyle = 'h-9 max-w-full rounded-md border border-input bg-background px-3 text-sm'

export function SeanCategoryTrendsPanel(props: Props) {
  const { transactions, categories, currency, now, loading, error, total, truncated, categoryTruncated, onRefresh } = props
  const [months, setMonths] = useState<3 | 6 | 12>(6)
  const [level, setLevel] = useState<'parent' | 'leaf'>('parent')
  const [comparisonMonth, setComparisonMonth] = useState(() => trendMonthKey(now))
  const [samePeriod, setSamePeriod] = useState(false)
  const [categoryId, setCategoryId] = useState('__all')
  const [detail, setDetail] = useState<{ title: string; items: WorkspaceTransaction[] } | null>(null)
  useEffect(() => { setDetail(null) }, [transactions, currency])
  const analysis = useMemo(() => analyzeCategoryTrends(transactions, categories, {
    months, level, comparisonMonth, samePeriod, currency, now,
  }), [transactions, categories, months, level, comparisonMonth, samePeriod, currency, now])
  const selected = analysis.rows.find((row) => row.id === categoryId) ?? analysis.all
  const increases = analysis.rows.filter((row) => row.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5)
  const decreases = analysis.rows.filter((row) => row.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5)
  const comparisonLabel = `${analysis.all.previous.month} ${analysis.samePeriod ? '同期' : '全月'}`
  const comparisonNote = analysis.samePeriod
    ? '截至当前时刻，与上月同日同一时刻比较；上月天数不足时截至上月月底。'
    : analysis.currentPartial ? '本月尚未结束，正在与上个完整月比较，增减幅度仅供参考。' : '两个完整自然月之间的比较。'
  const openComparison = (row: CategoryTrend) => setDetail({ title: `${row.name} · ${analysis.comparisonMonth} 与${comparisonLabel}`, items: [...row.currentItems, ...row.previousItems] })
  const ranked = (title: string, rows: CategoryTrend[], rising: boolean) => <Card>
    <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{analysis.comparisonMonth} 与{comparisonLabel}比较，按变化金额排列。点击查看两个期间的交易。</CardDescription></CardHeader>
    <CardContent className="space-y-2">{rows.map((row) => <button type="button" key={row.id} onClick={() => openComparison(row)} className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 text-left hover:bg-muted/60">
      <span className="min-w-0"><span className="block truncate text-sm font-medium">{row.name}</span><span className="text-xs text-muted-foreground">{row.previous.count} → {row.current.count} 笔 · {change(row)}</span></span>
      <span className={`shrink-0 font-mono text-sm ${rising ? 'text-expense' : 'text-income'}`}>{rising ? '+' : '−'}{money(Math.abs(row.delta), currency)}</span>
    </button>)}{!rows.length && <p className="py-5 text-sm text-muted-foreground">暂无{rising ? '增加' : '减少'}的分类。</p>}</CardContent>
  </Card>

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">分类消费趋势</h1><p className="mt-1 text-sm text-muted-foreground">查看支出变化来自哪些分类，以及消费次数和平均单笔的变化。</p></div><Button variant="outline" onClick={onRefresh} disabled={loading}>{loading ? '正在加载…' : '刷新'}</Button></div>
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-2 text-sm">趋势范围<select className={selectStyle} value={months} onChange={(event) => { setMonths(Number(event.target.value) as 3 | 6 | 12); setDetail(null) }}><option value={3}>近 3 个月</option><option value={6}>近 6 个月</option><option value={12}>近 12 个月</option></select></label>
      <label className="flex items-center gap-2 text-sm">分类层级<select className={selectStyle} value={level} onChange={(event) => { setLevel(event.target.value as 'parent' | 'leaf'); setCategoryId('__all'); setDetail(null) }}><option value="parent">一级分类汇总</option><option value="leaf">二级及直接记账分类</option></select></label>
      <label className="flex items-center gap-2 text-sm">对比月份<select className={selectStyle} value={analysis.comparisonMonth} onChange={(event) => { setComparisonMonth(event.target.value); setDetail(null) }}>{[...analysis.monthKeys].reverse().map((month) => <option key={month} value={month}>{month}{month === trendMonthKey(now) ? '（未结束）' : ''}</option>)}</select></label>
      {analysis.currentPartial && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={samePeriod} onChange={(event) => { setSamePeriod(event.target.checked); setDetail(null) }} />只比较上月同期（不含上月剩余日期）</label>}
    </div>
    <div className="space-y-1 rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
      <p>仅分析当前账本已计入统计的支出，排除收入、转账和未来交易。金额统一为 {currency}，外币使用交易保存的本位币金额，不采用当前汇率重新计算。</p>
      <p>{comparisonNote} 一级分类包含自身及直属子分类；未同步或无法确认父子关系的分类单独显示。</p>
      <p>已读取 {transactions.length.toLocaleString()} / {total.toLocaleString()} 笔交易（近 13 个自然月至今，含对比基线），单页最多读取 10,000 笔。</p>
      {truncated && <p className="font-medium text-destructive">数据超过读取上限或分页未完整返回，以下结果仅覆盖已读取交易，较早月份可能不完整。</p>}
      {categoryTruncated && <p className="text-destructive">分类读取达到上限，部分父子关系可能无法合并。</p>}
      {analysis.ignoredCount > 0 && <p className="text-destructive">已忽略 {analysis.ignoredCount} 笔缺少本位币金额的外币支出：{analysis.ignoredCurrencies.join('、')}。</p>}
    </div>
    {error ? <Card><CardContent className="py-8 text-destructive">分类趋势加载失败，请刷新重试。</CardContent></Card> : loading ? <Card><CardContent className="py-8 text-muted-foreground">正在加载分类和交易数据…</CardContent></Card> : <>
      <h2 className="text-sm font-semibold">全部分类支出对比</h2>
      <div className="grid gap-3 sm:grid-cols-3">{[
        { label: `${analysis.comparisonMonth} 支出${analysis.currentPartial ? '（截至目前）' : ''}`, value: money(analysis.all.current.amount, currency), className: 'text-expense', hint: `${analysis.all.current.count} 笔 · 平均 ${money(analysis.all.current.average, currency)}` },
        { label: `${analysis.all.previous.month} ${analysis.samePeriod ? '同期' : '全月'}支出`, value: money(analysis.all.previous.amount, currency), className: 'text-expense', hint: `${analysis.all.previous.count} 笔 · 平均 ${money(analysis.all.previous.average, currency)}` },
        { label: '支出增减', value: `${analysis.all.delta > 0 ? '+' : analysis.all.delta < 0 ? '−' : ''}${money(Math.abs(analysis.all.delta), currency)}`, className: analysis.all.delta > 0 ? 'text-expense' : analysis.all.delta < 0 ? 'text-income' : '', hint: change(analysis.all) },
      ].map((item) => <Card key={item.label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className={`my-2 break-all font-mono text-xl font-semibold ${item.className}`}>{item.value}</p><p className="text-xs text-muted-foreground">{item.hint}</p></CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle>分类月度趋势</CardTitle><CardDescription>曲线为各月支出总额；当前月尚未结束。点击下方月份查看明细。</CardDescription></CardHeader><CardContent>
        <label className="mb-4 flex flex-wrap items-center gap-2 text-sm">查看分类<select className={selectStyle} value={selected.id} onChange={(event) => setCategoryId(event.target.value)}><option value="__all">全部分类</option>{analysis.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        {analysis.all.items.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={selected.months}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="month" tickFormatter={(value: string) => value.slice(5)} /><YAxis width={58} tickFormatter={(value: number) => value >= 10000 ? `${(value / 10000).toFixed(1)}万` : `${Math.round(value)}`} /><Tooltip formatter={((value: number) => [money(value, currency), '支出']) as never} /><Line type="monotone" dataKey="amount" stroke="rgb(var(--expense-rgb))" strokeWidth={2.5} name="支出" /></LineChart></ResponsiveContainer></div> : <p className="py-10 text-center text-sm text-muted-foreground">当前范围没有可统计的支出。</p>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{[...selected.months].reverse().map((row) => <button type="button" key={row.month} className="rounded-lg border p-3 text-left hover:bg-muted/30" onClick={() => setDetail({ title: `${selected.name} · ${row.month}`, items: selected.items.filter((tx) => trendMonthKey(new Date(tx.happened_at)) === row.month) })}><span className="flex items-center justify-between gap-2 text-sm"><span>{row.month}{row.month === trendMonthKey(now) ? ' · 未结束' : ''}</span><span className="font-mono text-expense">{money(row.amount, currency)}</span></span><span className="mt-1 block text-xs text-muted-foreground">{row.count} 笔 · 平均单笔 {money(row.average, currency)}</span></button>)}</div>
      </CardContent></Card>
      <div className="grid gap-5 lg:grid-cols-2">{ranked('支出增加最多的分类', increases, true)}{ranked('支出减少最多的分类', decreases, false)}</div>
      <SeanCategoryMonthlyDetails rows={analysis.rows} monthKeys={analysis.monthKeys} currentMonth={trendMonthKey(now)}
        format={value => money(value, currency)} onDetails={(title, items) => setDetail({ title, items })} />
    </>}
    <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null) }}><DialogContent className="max-h-[82vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{detail?.title || '交易明细'}</DialogTitle><DialogDescription>仅展示本报表纳入统计的支出，按时间倒序排列。</DialogDescription></DialogHeader><div className="divide-y">{detail?.items.slice().sort((a, b) => b.happened_at.localeCompare(a.happened_at)).map((tx) => <div key={tx.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{tx.note || tx.category_name || '未分类支出'}</p><p className="text-xs text-muted-foreground">{new Date(tx.happened_at).toLocaleString()} · {tx.category_name || '未分类'} · {tx.account_name || '未指定账户'}</p></div><span className="shrink-0 font-mono text-sm text-expense">−{money(trendExpenseAmount(tx, currency) ?? 0, currency)}</span></div>)}{!detail?.items.length && <p className="py-8 text-center text-sm text-muted-foreground">该期间没有符合条件的交易。</p>}</div></DialogContent></Dialog>
  </div>
}
