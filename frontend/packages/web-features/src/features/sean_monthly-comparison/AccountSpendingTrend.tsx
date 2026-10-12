import { AccountSpendingComparison } from './AccountSpendingComparison'
import { useEffect, useMemo, useState } from 'react'
import type { WorkspaceAccount, WorkspaceTransaction } from '@beecount/api-client'
import { Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@beecount/ui'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ReportHelp } from '../../lib/ReportHelp'
import { analyzeAccountSpending, spendingAmount, spendingMonth } from './accountSpending'

type Props = { transactions: WorkspaceTransaction[]; accounts: WorkspaceAccount[]; currency: string; loading: boolean; error: boolean; now?: Date }
function money(amount: number, currency: string) { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount) } catch { return `${currency} ${amount.toFixed(2)}` } }

export function AccountSpendingTrend({ transactions, accounts, currency, loading, error, now }: Props) {
  const [accountId, setAccountId] = useState('__all')
  const [detailMonth, setDetailMonth] = useState<string | null>(null)
  useEffect(() => { setDetailMonth(null) }, [transactions, accounts, currency])
  const result = useMemo(() => analyzeAccountSpending(transactions, accounts, currency, accountId, now), [transactions, accounts, currency, accountId, now])
  const name = result.eligible.find(row => row.id === result.selectedId)?.name || '全部流水账户'
  const detail = result.buckets.find(row => row.month === detailMonth)
  const currentMonth = spendingMonth(now || new Date())
  const accountControl = <label className="flex min-w-0 items-center gap-2 text-sm">账户<select aria-label="支出趋势账户" className="h-9 min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm" value={result.selectedId} onChange={event => { setAccountId(event.target.value); setDetailMonth(null) }}><option value="__all">全部流水账户</option>{result.eligible.map(row => <option key={row.id} value={row.id}>{row.name}{row.hidden ? '（已隐藏）' : ''}</option>)}</select></label>
  return <Card>
    <CardHeader><CardTitle className="flex items-center justify-between gap-2">账户支出趋势<ReportHelp label="账户支出趋势说明" text="只分析当前账本近 12 个月支出。纳入现金、储蓄卡、信用卡、支付宝、微信及普通流水账户；社保、保险、房产、车辆等估值账户不参与。收入、转账、信用卡还款及不计入统计的交易排除。金额使用保存的本位币快照。曲线反映消费使用哪个账户，不代表账户余额变化。全部账户模式按类型比较有支出的账户，默认选中支出最高的 5 个，可勾选其他账户。单账户模式点击月份查看明细。" /></CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {result.selectedId !== '__all' && <div className="flex flex-wrap items-center justify-between gap-3">{accountControl}{result.selectedId !== '__all' && <p className="text-xs text-muted-foreground">当前账本 · {result.count} 笔 · 合计 <span className="font-mono text-expense">{money(result.total, currency)}</span></p>}</div>}
      {error ? <p className="py-6 text-sm text-destructive">账户趋势加载失败，请刷新重试。</p> : loading ? <p className="py-6 text-sm text-muted-foreground">正在加载账户支出…</p> : <>
        {result.unmatchedCount > 0 && <p className="text-xs text-muted-foreground">{result.unmatchedCount} 笔支出未匹配到可用流水账户或属于非流水账户，未纳入此区块。</p>}
        {result.ignoredCount > 0 && <p className="text-xs text-expense">{result.ignoredCount} 笔金额无效或缺少本位币快照的支出未纳入。</p>}
        {result.selectedId === '__all' ? <AccountSpendingComparison accountControl={accountControl} result={result} currency={currency} currentMonth={currentMonth} format={amount => money(amount, currency)} /> : <>
        <div className="h-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={result.buckets}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="month" tickFormatter={value => String(value).slice(5)}/><YAxis width={56} tickFormatter={value => value >= 10000 ? `${(value / 10000).toFixed(1)}万` : `${Math.round(value)}`}/><Tooltip labelFormatter={label => `${label}${label === currentMonth ? '（未结束）' : ''}`} formatter={((value: number) => [money(value, currency), '支出']) as never}/><Line type="monotone" dataKey="amount" name="支出" stroke="rgb(var(--expense-rgb))" strokeWidth={2.5}/></LineChart></ResponsiveContainer></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{[...result.buckets].reverse().map(row => <button type="button" key={row.month} aria-label={`${name} ${row.month} 账户支出明细`} onClick={() => setDetailMonth(row.month)} className="min-w-0 rounded-lg border p-3 text-left hover:bg-muted/30"><span className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{row.month}{row.month === currentMonth ? ' · 未结束' : ''}</span><span className="font-mono text-expense">{money(row.amount, currency)}</span></span><span className="mt-1 block text-xs text-muted-foreground">{row.count} 笔 · 平均 {money(row.average, currency)}</span></button>)}</div>
        </>}
      </>}
    </CardContent>
    <Dialog open={Boolean(detailMonth)} onOpenChange={open => { if (!open) setDetailMonth(null) }}><DialogContent className="max-h-[82vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{name} · {detailMonth}</DialogTitle><DialogDescription>当前账本支出 · {detail?.count || 0} 笔 · {money(detail?.amount || 0, currency)}{detailMonth === currentMonth ? ' · 未结束' : ''}</DialogDescription></DialogHeader><div className="divide-y">{detail?.items.slice().sort((a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime()).map(tx => <div key={tx.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{tx.note || tx.category_name || '未命名支出'}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(tx.happened_at).toLocaleString()} · {tx.category_name || '未分类'} · {tx.account_name || '未指定账户'}</p></div><span className="shrink-0 font-mono text-sm text-expense">−{money(spendingAmount(tx, currency) || 0, currency)}</span></div>)}{!detail?.items.length && <p className="py-6 text-center text-sm text-muted-foreground">该账户当月没有符合条件的支出。</p>}</div></DialogContent></Dialog>
  </Card>
}
