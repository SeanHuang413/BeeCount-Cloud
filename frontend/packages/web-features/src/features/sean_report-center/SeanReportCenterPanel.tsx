import { useState } from 'react'
import type { WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beecount/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@beecount/ui'
import { ArrowRight, BadgeAlert, ChartNoAxesCombined, CircleDollarSign, ReceiptText, Tags, WalletCards } from 'lucide-react'

import { analyzeSeanReports, type SeanReportRow } from './analyzeSeanReports'
import { SeanReportDetailsDialog, type SeanReportDetailKind, type SeanReportDetailSelection } from './SeanReportDetailsDialog'
import { CategoryStructureCard } from './CategoryStructureCard'
import { TransferFlowCard } from './TransferFlowCard'
import { MonthSwitcher } from '../sean_time/MonthSwitcher'

type SeanReportPeriod = 'month' | 'last-month' | 'three-months' | 'six-months' | 'twelve-months' | 'custom-month' | 'all'
type Props = { transactions: WorkspaceTransaction[]; categories: WorkspaceCategory[]; currency: string; period: SeanReportPeriod; onPeriodChange: (period: SeanReportPeriod) => void; selectedMonth: string; onSelectedMonthChange: (month: string) => void; loading: boolean; error: boolean; onRefresh: () => void; onOpenTransactions: (query: string) => void }

function money(value: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}

function Input({ value, max, onChange }: { value: string; max: string; className?: string; type?: string; onChange: (event: { target: { value: string } }) => void }) {
  return <MonthSwitcher value={value} max={max} onChange={(month) => onChange({ target: { value: month } })} />
}

function ReportRows({ rows, currency, onOpen }: { rows: SeanReportRow[]; currency: string; onOpen: (query: string) => void }) {
  if (!rows.length) return <p className="py-6 text-sm text-muted-foreground">暂无足够数据。</p>
  return <div className="divide-y divide-border/70">{rows.map((row) => <button key={row.name} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-muted/40" onClick={() => onOpen(row.name)}>
    <span className="min-w-0"><span className="block truncate font-medium">{row.name}</span><span className="text-xs text-muted-foreground">{row.count} 笔</span></span>
    <span className="shrink-0 text-right"><span className="block font-mono text-sm text-expense">-{money(row.expense, currency)}</span><span className={`text-xs ${row.balance >= 0 ? 'text-income' : 'text-expense'}`}>结余 {row.balance >= 0 ? '+' : ''}{money(row.balance, currency)}</span></span>
  </button>)}</div>
}

function IncomeRows({ rows, currency, onOpen }: { rows: SeanReportRow[]; currency: string; onOpen: (query: string) => void }) {
  if (!rows.length) return <p className="py-6 text-sm text-muted-foreground">暂无收入数据。</p>
  return <div className="divide-y divide-border/70">{rows.map((row) => <button key={row.name} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-muted/40" onClick={() => onOpen(row.name)}>
    <span className="min-w-0"><span className="block truncate font-medium">{row.name}</span><span className="text-xs text-muted-foreground">{row.count} 笔收入</span></span>
    <span className="shrink-0 font-mono text-sm font-semibold text-income">+{money(row.income, currency)}</span>
  </button>)}</div>
}

export function SeanReportCenterPanel({ transactions, categories, currency, period, onPeriodChange, selectedMonth, onSelectedMonthChange, loading, error, onRefresh, onOpenTransactions }: Props) {
  const report = analyzeSeanReports(transactions)
  const [detailSelection, setDetailSelection] = useState<SeanReportDetailSelection>(null)
  const openDetails = (kind: SeanReportDetailKind) => (name: string) => setDetailSelection({ kind, name })
  return <div className="mx-auto min-w-0 max-w-[1440px] space-y-5">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl font-bold tracking-tight">我的报表</h1><p className="mt-1 text-sm text-muted-foreground">基于云端已同步交易的只读分析；转账单独展示，“不计入统计”交易自动排除。</p></div><div className="flex min-w-0 flex-wrap items-center gap-2"><Select value={period} onValueChange={(value) => onPeriodChange(value as SeanReportPeriod)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">本月</SelectItem><SelectItem value="last-month">上月</SelectItem><SelectItem value="three-months">近 3 个月</SelectItem><SelectItem value="six-months">近 6 个月</SelectItem><SelectItem value="twelve-months">近 12 个月</SelectItem><SelectItem value="custom-month">指定月份</SelectItem><SelectItem value="all">全部记录</SelectItem></SelectContent></Select>{period === 'custom-month' ? <Input type="month" value={selectedMonth} max={new Date().toLocaleDateString('sv-SE').slice(0, 7)} onChange={(event) => onSelectedMonthChange(event.target.value)} className="w-40"/> : null}<Button variant="outline" onClick={onRefresh} disabled={loading}>刷新数据</Button></div></div>
    {error ? <Card><CardContent className="py-8 text-sm text-destructive">报表数据加载失败，请稍后重试。</CardContent></Card> : null}
    <div className="grid min-w-0 gap-4 [&>*]:min-w-0 xl:grid-cols-3">
      <div className="xl:col-span-3"><CategoryStructureCard transactions={transactions} categories={categories} currency={currency} /></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-income" />收入来源</CardTitle><CardDescription>按备注或收入名称汇总；点击可在当前页面查看明细。</CardDescription></CardHeader><CardContent><IncomeRows rows={report.incomeSources} currency={currency} onOpen={openDetails('income')} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5 text-amber-500" />标签项目结算</CardTitle><CardDescription>按标签汇总收入、支出与结余；点击可在当前页面查看明细。</CardDescription></CardHeader><CardContent><ReportRows rows={report.tags} currency={currency} onOpen={openDetails('tag')} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />高频消费</CardTitle><CardDescription>按备注或消费名称汇总；点击可在当前页面查看明细。</CardDescription></CardHeader><CardContent><ReportRows rows={report.repeatMerchants} currency={currency} onOpen={openDetails('merchant')} /></CardContent></Card>
    </div>
    <div className="grid min-w-0 gap-4 [&>*]:min-w-0 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BadgeAlert className="h-5 w-5 text-expense" />大额支出复核</CardTitle><CardDescription>单笔达到 {money(report.largeExpenseThreshold, currency)} 才会列出；仅提示复核，不代表可以砍掉。</CardDescription></CardHeader><CardContent>{report.largeExpenses.length ? <div className="divide-y divide-border/70">{report.largeExpenses.map((tx) => <button key={tx.id} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-muted/40" onClick={() => setDetailSelection({ kind: 'large-expense', name: tx.id })}><span className="min-w-0"><span className="block truncate font-medium">{tx.note || tx.category_name || '未命名交易'}</span><span className="text-xs text-muted-foreground">{tx.happened_at.slice(0, 10)}</span></span><span className="font-mono font-semibold text-expense">-{money(tx.reportAmount, currency)}</span></button>)}</div> : <p className="py-6 text-sm text-muted-foreground">当前没有达到复核阈值的大额支出。</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ChartNoAxesCombined className="h-5 w-5 text-primary" />周现金流</CardTitle><CardDescription>最近 8 周的收入、支出与净结余；适合观察短期变化。</CardDescription></CardHeader><CardContent>{report.weeks.length ? <div className="space-y-3">{report.weeks.map((week) => <div key={week.weekStart} className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-y-0"><span className="text-xs text-muted-foreground">{week.weekStart}</span><div className="col-span-2 h-2 min-w-0 overflow-hidden rounded bg-expense/10 sm:col-span-1"><div className="h-full rounded bg-expense" style={{ width: `${Math.min(100, week.expense / Math.max(...report.weeks.map((item) => item.expense), 1) * 100)}%` }} /></div><span className={`row-start-1 text-right font-mono text-sm font-medium sm:col-start-3 ${week.balance >= 0 ? 'text-income' : 'text-expense'}`}>{week.balance >= 0 ? '+' : ''}{money(week.balance, currency)}</span></div>)}</div> : <p className="py-6 text-sm text-muted-foreground">暂无周现金流数据。</p>}</CardContent></Card>
      <TransferFlowCard transactions={transactions} currency={currency} />
    </div>
    <Card className="min-w-0 border-primary/20 bg-primary/[0.03]"><CardContent className="flex min-w-0 flex-wrap items-center gap-3 py-4 text-sm"><WalletCards className="h-5 w-5 shrink-0 text-primary" /><span className="min-w-0 flex-1 basis-[220px]">想找可以优化的支出，可继续使用“省钱洞察”：它会对高频、上升和疑似订阅消费做更保守的筛选。</span><Button size="sm" variant="outline" className="shrink-0 sm:ml-auto" onClick={() => onOpenTransactions('')}>查看交易 <ArrowRight className="ml-1 h-4 w-4" /></Button></CardContent></Card>
    <SeanReportDetailsDialog selection={detailSelection} transactions={transactions} currency={currency} onOpenChange={(open) => { if (!open) setDetailSelection(null) }} />
  </div>
}
