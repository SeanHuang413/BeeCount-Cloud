import { useState } from 'react'
import type { WorkspaceTransaction } from '@beecount/api-client'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useT } from '@beecount/ui'
import { ArrowRight, CircleDollarSign, RefreshCw, SearchX, TrendingUp, WalletCards } from 'lucide-react'

import { analyzeSeanSpendCandidates, type SeanSpendInsight } from './analyzeSpendCandidates'
import { SeanSpendInsightDetailsDialog } from './SeanSpendInsightDetailsDialog'

export type SeanSpendInsightPeriod = 'month' | 'last-month' | 'three-months' | 'six-months' | 'twelve-months' | 'all'

type Props = {
  transactions: WorkspaceTransaction[]
  currency: string
  period: SeanSpendInsightPeriod
  onPeriodChange: (period: SeanSpendInsightPeriod) => void
  loading: boolean
  error: boolean
  onRefresh: () => void
}

function formatMoney(value: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}

function amountOf(tx: WorkspaceTransaction): number { return Math.abs(Number(tx.native_amount ?? tx.amount) || 0) }
function kindLabel(insight: SeanSpendInsight, t: ReturnType<typeof useT>): string {
  if (insight.kind === 'subscription') return t('sean.spendInsights.kind.subscription')
  if (insight.kind === 'rising') return t('sean.spendInsights.kind.rising')
  return t('sean.spendInsights.kind.frequent')
}

export function SeanSpendInsightsPanel({ transactions, currency, period, onPeriodChange, loading, error, onRefresh }: Props) {
  const t = useT()
  const result = analyzeSeanSpendCandidates(transactions)
  const [selectedInsight, setSelectedInsight] = useState<SeanSpendInsight | null>(null)
  const totals = transactions.reduce((summary, tx) => {
    if (tx.exclude_from_stats || (tx.tx_type !== 'income' && tx.tx_type !== 'expense')) return summary
    if (tx.tx_type === 'income') summary.income += amountOf(tx)
    else summary.expense += amountOf(tx)
    summary.count += 1
    return summary
  }, { income: 0, expense: 0, count: 0 })
  const balance = totals.income - totals.expense
  const expenseCount = transactions.filter((tx) => tx.tx_type === 'expense' && !tx.exclude_from_stats && amountOf(tx) > 0).length
  const periodLabel = { month: '本月', 'last-month': '上个月', 'three-months': '近 3 个月', 'six-months': '近 6 个月', 'twelve-months': '近 12 个月', all: '全部记录' }[period]

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">{t('sean.spendInsights.title')}</h1><p className="mt-1 text-sm text-muted-foreground">从{periodLabel}的已记账支出中，找出值得你亲自复核的消费模式。</p></div><div className="flex items-center gap-2"><Select value={period} onValueChange={(value) => onPeriodChange(value as SeanSpendInsightPeriod)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">本月</SelectItem><SelectItem value="last-month">上个月</SelectItem><SelectItem value="three-months">近 3 个月</SelectItem><SelectItem value="six-months">近 6 个月</SelectItem><SelectItem value="twelve-months">近 12 个月</SelectItem><SelectItem value="all">全部记录</SelectItem></SelectContent></Select><Button variant="outline" onClick={onRefresh} disabled={loading}><RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />{t('sean.spendInsights.refresh')}</Button></div></div>

    <Card className="border-primary/20 bg-primary/[0.03]"><CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-primary" />收支概览</CardTitle><CardDescription>当前时间范围内已计入统计的全部收入和支出。</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">收入</p><p className="mt-1 text-xl font-semibold text-income">+{formatMoney(totals.income, currency)}</p></div><div><p className="text-xs text-muted-foreground">支出</p><p className="mt-1 text-xl font-semibold text-expense">-{formatMoney(totals.expense, currency)}</p></div><div><p className="text-xs text-muted-foreground">净结余</p><p className={`mt-1 text-xl font-semibold ${balance >= 0 ? 'text-income' : 'text-expense'}`}>{balance >= 0 ? '+' : ''}{formatMoney(balance, currency)}</p></div><div><p className="text-xs text-muted-foreground">笔数</p><p className="mt-1 text-xl font-semibold">{totals.count}</p></div></CardContent></Card>

    <Card className="border-primary/20 bg-primary/[0.03]"><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" />{periodLabel}洞察概览</CardTitle><CardDescription>统计口径与当前选择的时间范围一致；仅支出参与省钱提示分析。</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">{periodLabel}支出</p><p className="mt-1 text-xl font-semibold text-expense">-{formatMoney(totals.expense, currency)}</p></div><div><p className="text-xs text-muted-foreground">参与分析的支出笔数</p><p className="mt-1 text-xl font-semibold">{expenseCount}</p></div><div><p className="text-xs text-muted-foreground">省钱提示（规则数）</p><p className="mt-1 text-xl font-semibold">{result.insights.length}</p></div></CardContent></Card>

    {error ? <Card><CardContent className="py-8 text-sm text-destructive">{t('sean.spendInsights.error')}</CardContent></Card> : null}
    {!loading && !error && result.insights.length === 0 ? <Card><CardContent className="flex flex-col items-center py-12 text-center"><SearchX className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">{t('sean.spendInsights.empty.title')}</p><p className="mt-1 max-w-md text-sm text-muted-foreground">{t('sean.spendInsights.empty.description')}</p></CardContent></Card> : null}
    {result.insights.length > 0 ? <div className="grid gap-4 lg:grid-cols-2">{result.insights.map((insight) => <Card key={insight.id}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle>{insight.title}</CardTitle><CardDescription className="mt-2">{kindLabel(insight, t)}</CardDescription></div><TrendingUp className="h-5 w-5 shrink-0 text-expense" /></div></CardHeader><CardContent><p className="text-2xl font-semibold text-expense">{formatMoney(insight.currentAmount, currency)}</p><p className="mt-1 text-sm text-muted-foreground">{periodLabel} {insight.transactionCount} 笔交易</p><Button className="mt-4" variant="outline" size="sm" onClick={() => setSelectedInsight(insight)}>{t('sean.spendInsights.openTransactions')}<ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent></Card>)}</div> : null}
    <p className="text-xs leading-5 text-muted-foreground">{t('sean.spendInsights.disclaimer')}</p>
    <SeanSpendInsightDetailsDialog insight={selectedInsight} transactions={transactions} currency={currency} onOpenChange={(open) => { if (!open) setSelectedInsight(null) }} />
  </div>
}
