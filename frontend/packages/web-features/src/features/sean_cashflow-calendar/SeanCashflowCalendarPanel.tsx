import { useMemo, useState } from 'react'
import type { WorkspaceAccount, WorkspaceTransaction } from '@beecount/api-client'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beecount/ui'
import { AlertTriangle, CalendarClock, CreditCard, Sparkles } from 'lucide-react'
import { buildCashflowForecast } from './cashflowForecast'

type Props = { transactions: WorkspaceTransaction[]; accounts: WorkspaceAccount[]; currency: string; loading: boolean; error: boolean; onRefresh: () => void }
function money(value: number, currency: string) { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) } catch { return `${currency} ${value.toFixed(2)}` } }

export function SeanCashflowCalendarPanel({ transactions, accounts, currency, loading, error, onRefresh }: Props) {
  const [days, setDays] = useState<30 | 60>(30)
  const forecast = useMemo(() => buildCashflowForecast(transactions, accounts, currency, days), [transactions, accounts, currency, days])
  const grouped = forecast.events.reduce<Map<string, typeof forecast.events>>((map, event) => map.set(event.date, [...(map.get(event.date) || []), event]), new Map())
  return <div className="mx-auto min-w-0 max-w-[1440px] space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">资金日历</h1><p className="mt-1 text-sm text-muted-foreground">查看未来资金安排和可能出现的余额压力。</p></div><div className="flex gap-2"><Button size="sm" variant={days === 30 ? 'default' : 'outline'} onClick={() => setDays(30)}>未来 30 天</Button><Button size="sm" variant={days === 60 ? 'default' : 'outline'} onClick={() => setDays(60)}>未来 60 天</Button><Button size="sm" variant="outline" disabled={loading} onClick={onRefresh}>刷新</Button></div></div>
    {error ? <Card><CardContent className="py-8 text-sm text-destructive">资金日历数据加载失败。</CardContent></Card> : null}
    {forecast.ignoredCurrencies.length ? <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="py-4 text-sm">当前仅汇总本位币 {currency}；已忽略 {forecast.ignoredCurrencies.join('、')}，避免不同币种直接相加。</CardContent></Card> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">当前可用余额</p><p className="mt-1 font-mono text-xl font-semibold">{money(forecast.openingBalance, currency)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">预计收入</p><p className="mt-1 font-mono text-xl font-semibold text-income">+{money(forecast.expectedIncome, currency)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">预计支出与还款</p><p className="mt-1 font-mono text-xl font-semibold text-expense">-{money(forecast.expectedExpense, currency)}</p></CardContent></Card>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">期末预计余额</p><p className={`mt-1 font-mono text-xl font-semibold ${forecast.projectedBalance < 0 ? 'text-expense' : ''}`}>{money(forecast.projectedBalance, currency)}</p></CardContent></Card>
    </div>
    {forecast.lowestBalance < 0 ? <Card className="border-expense/40 bg-expense/5"><CardContent className="flex gap-3 py-4 text-sm"><AlertTriangle className="h-5 w-5 shrink-0 text-expense"/><span>预计 {forecast.lowestBalanceDate} 可用余额降至 <b className="text-expense">{money(forecast.lowestBalance, currency)}</b>，建议提前预留资金。</span></CardContent></Card> : null}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary"/>未来安排</CardTitle><CardDescription>“历史推测”来自至少 3 个月稳定重复记录；实际发生时间和金额可能变化。</CardDescription></CardHeader><CardContent>{loading ? <p className="py-6 text-sm text-muted-foreground">正在分析历史记录…</p> : grouped.size ? <div className="divide-y divide-border/70">{[...grouped].map(([date, events]) => <div key={date} className="grid gap-2 py-4 sm:grid-cols-[110px_1fr]"><div className="font-medium">{date}</div><div className="space-y-2">{events.map((event) => <div key={event.id} className="flex min-w-0 items-start justify-between gap-3 rounded-lg bg-muted/30 p-3"><div className="min-w-0"><p className="flex items-center gap-2 font-medium">{event.source === 'credit-card' ? <CreditCard className="h-4 w-4 shrink-0 text-expense"/> : <Sparkles className="h-4 w-4 shrink-0 text-primary"/>}<span className="truncate">{event.title}</span></p><p className="mt-1 text-xs text-muted-foreground">{event.source === 'credit-card' ? '信用卡计划' : '历史推测'} · {event.detail}</p></div><span className={`shrink-0 font-mono font-semibold ${event.kind === 'income' ? 'text-income' : 'text-expense'}`}>{event.kind === 'income' ? '+' : '-'}{money(event.amount, currency)}</span></div>)}</div></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">暂未发现足够稳定的周期收支，也没有待展示的信用卡还款计划。</p>}</CardContent></Card>
    <p className="text-xs text-muted-foreground">本页只读，不会创建交易或修改账户。预测仅用于安排资金，不代表实际账单。</p>
  </div>
}
