import { useState } from 'react'
import type { WorkspaceAccount, WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beecount/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@beecount/ui'
import { ArrowRight, BadgeAlert, ChartNoAxesCombined, CircleDollarSign, ReceiptText, Tags, WalletCards } from 'lucide-react'

import { analyzeSeanReports, type SeanReportRow } from './analyzeSeanReports'
import { SeanReportDetailsDialog, type SeanReportDetailKind, type SeanReportDetailSelection } from './SeanReportDetailsDialog'
import { CategoryStructureCard } from './CategoryStructureCard'
import { accountBalance, computeCurrencySummary, splitByCurrency } from '../../lib/assetAggregation'

type SeanReportPeriod = 'month' | 'last-month' | 'three-months' | 'six-months' | 'twelve-months' | 'all'
type Props = { transactions: WorkspaceTransaction[]; accounts: WorkspaceAccount[]; categories: WorkspaceCategory[]; currency: string; period: SeanReportPeriod; onPeriodChange: (period: SeanReportPeriod) => void; loading: boolean; error: boolean; onRefresh: () => void; onOpenTransactions: (query: string) => void; onOpenAssets: () => void }

function money(value: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
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

function AssetReport({ accounts, onOpenAssets }: { accounts: WorkspaceAccount[]; onOpenAssets: () => void }) {
  const buckets = [...splitByCurrency(accounts).entries()]
  if (!buckets.length) return <Card><CardHeader><CardTitle>资产概览</CardTitle><CardDescription>暂无账户数据。</CardDescription></CardHeader></Card>
  return <Card><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" />资产概览</CardTitle><CardDescription>账户余额与官方资产页使用相同口径；不同币种分别展示，不相加。</CardDescription></div><Button size="sm" variant="outline" onClick={onOpenAssets}>查看资产</Button></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{buckets.map(([currency, rows]) => {
    const summary = computeCurrencySummary(rows)
    return <div key={currency} className="rounded-xl border border-border/70 bg-muted/20 p-4"><div className="flex items-baseline justify-between"><p className="text-sm font-semibold">{currency}</p><p className={`font-mono text-lg font-bold ${summary.netWorth >= 0 ? 'text-income' : 'text-expense'}`}>{money(summary.netWorth, currency)}</p></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-muted-foreground">资产</p><p className="mt-1 font-mono text-income">{money(summary.assetTotal, currency)}</p></div><div><p className="text-muted-foreground">负债</p><p className="mt-1 font-mono text-expense">-{money(Math.abs(summary.liabilityTotal), currency)}</p></div></div><div className="mt-3 border-t border-border/70 pt-2">{[...rows].sort((a, b) => Math.abs(accountBalance(b)) - Math.abs(accountBalance(a))).slice(0, 4).map((row) => <div key={row.id} className="flex justify-between gap-3 py-1 text-xs"><span className="truncate text-muted-foreground">{row.name}</span><span className={accountBalance(row) >= 0 ? 'font-mono text-income' : 'font-mono text-expense'}>{money(accountBalance(row), currency)}</span></div>)}</div></div>
  })}</CardContent></Card>
}

export function SeanReportCenterPanel({ transactions, accounts, categories, currency, period, onPeriodChange, loading, error, onRefresh, onOpenTransactions, onOpenAssets }: Props) {
  const report = analyzeSeanReports(transactions)
  const [detailSelection, setDetailSelection] = useState<SeanReportDetailSelection>(null)
  const openDetails = (kind: SeanReportDetailKind) => (name: string) => setDetailSelection({ kind, name })
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">我的报表</h1><p className="mt-1 text-sm text-muted-foreground">基于云端已同步交易的只读分析；转账和“不计入统计”交易会自动排除。</p></div><div className="flex items-center gap-2"><Select value={period} onValueChange={(value) => onPeriodChange(value as SeanReportPeriod)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">本月</SelectItem><SelectItem value="last-month">上月</SelectItem><SelectItem value="three-months">近 3 个月</SelectItem><SelectItem value="six-months">近 6 个月</SelectItem><SelectItem value="twelve-months">近 12 个月</SelectItem><SelectItem value="all">全部记录</SelectItem></SelectContent></Select><Button variant="outline" onClick={onRefresh} disabled={loading}>刷新数据</Button></div></div>
    {error ? <Card><CardContent className="py-8 text-sm text-destructive">报表数据加载失败，请稍后重试。</CardContent></Card> : null}
    <div className="grid gap-4 xl:grid-cols-3">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5 text-amber-500" />标签项目结算</CardTitle><CardDescription>按标签汇总收入、支出与结余；点击可在当前页面查看明细。</CardDescription></CardHeader><CardContent><ReportRows rows={report.tags} currency={currency} onOpen={openDetails('tag')} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />高频消费</CardTitle><CardDescription>按备注或消费名称汇总；点击可在当前页面查看明细。</CardDescription></CardHeader><CardContent><ReportRows rows={report.repeatMerchants} currency={currency} onOpen={openDetails('merchant')} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-income" />收入来源</CardTitle><CardDescription>按备注或收入名称汇总；点击可在当前页面查看明细。</CardDescription></CardHeader><CardContent><IncomeRows rows={report.incomeSources} currency={currency} onOpen={openDetails('income')} /></CardContent></Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <CategoryStructureCard transactions={transactions} categories={categories} currency={currency} />
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BadgeAlert className="h-5 w-5 text-expense" />大额支出复核</CardTitle><CardDescription>单笔达到 {money(report.largeExpenseThreshold, currency)} 才会列出；仅提示复核，不代表可以砍掉。</CardDescription></CardHeader><CardContent>{report.largeExpenses.length ? <div className="divide-y divide-border/70">{report.largeExpenses.map((tx) => <button key={tx.id} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-muted/40" onClick={() => onOpenTransactions(tx.note || tx.category_name || '')}><span className="min-w-0"><span className="block truncate font-medium">{tx.note || tx.category_name || '未命名交易'}</span><span className="text-xs text-muted-foreground">{tx.happened_at.slice(0, 10)}</span></span><span className="font-mono font-semibold text-expense">-{money(tx.reportAmount, currency)}</span></button>)}</div> : <p className="py-6 text-sm text-muted-foreground">当前没有达到复核阈值的大额支出。</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ChartNoAxesCombined className="h-5 w-5 text-primary" />周现金流</CardTitle><CardDescription>最近 8 周的收入、支出与净结余；适合观察短期变化。</CardDescription></CardHeader><CardContent>{report.weeks.length ? <div className="space-y-3">{report.weeks.map((week) => <div key={week.weekStart} className="grid grid-cols-[92px_1fr_auto] items-center gap-3"><span className="text-xs text-muted-foreground">{week.weekStart}</span><div className="h-2 overflow-hidden rounded bg-expense/10"><div className="h-full rounded bg-expense" style={{ width: `${Math.min(100, week.expense / Math.max(...report.weeks.map((item) => item.expense), 1) * 100)}%` }} /></div><span className={`font-mono text-sm font-medium ${week.balance >= 0 ? 'text-income' : 'text-expense'}`}>{week.balance >= 0 ? '+' : ''}{money(week.balance, currency)}</span></div>)}</div> : <p className="py-6 text-sm text-muted-foreground">暂无周现金流数据。</p>}</CardContent></Card>
    </div>
    <Card className="border-primary/20 bg-primary/[0.03]"><CardContent className="flex items-center gap-3 py-4 text-sm"><WalletCards className="h-5 w-5 shrink-0 text-primary" /><span>想找可以优化的支出，可继续使用“省钱洞察”：它会对高频、上升和疑似订阅消费做更保守的筛选。</span><Button size="sm" variant="outline" className="ml-auto shrink-0" onClick={() => onOpenTransactions('')}>查看交易 <ArrowRight className="ml-1 h-4 w-4" /></Button></CardContent></Card>
    <SeanReportDetailsDialog selection={detailSelection} transactions={transactions} currency={currency} onOpenChange={(open) => { if (!open) setDetailSelection(null) }} />
  </div>
}
