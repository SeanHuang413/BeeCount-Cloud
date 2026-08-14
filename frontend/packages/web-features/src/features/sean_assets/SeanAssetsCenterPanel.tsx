import { useMemo } from 'react'
import type {
  ExchangeRateOverride,
  ExchangeRatesResponse,
  NetWorthHistory,
  ReadAccount,
} from '@beecount/api-client'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beecount/ui'
import {
  ArrowRight,
  Building2,
  ChevronRight,
  CreditCard,
  Landmark,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { accountBalance, LIABILITY_TYPES } from '../../lib/assetAggregation'
import { buildSeanAssetCenterSummary, seanAccountType, seanAssetGroup } from './assetCenter'

type Props = {
  accounts: ReadAccount[]
  history: NetWorthHistory | null
  baseCurrency: string
  rates: ExchangeRatesResponse | null
  overrides: ExchangeRateOverride[]
  loading: boolean
  error: boolean
  onRefresh: () => void
  onOpenAccount: (account: ReadAccount) => void
  onManageAccounts: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  savings_card: '#2563eb',
  electronic_cash: '#06b6d4',
  cash: '#14b8a6',
  investment: '#8b5cf6',
  social_fund: '#f59e0b',
  real_estate: '#84cc16',
  vehicle: '#0ea5e9',
  insurance: '#ec4899',
  other: '#64748b',
  liability_credit_card: '#ef4444',
  liability_loan: '#f97316',
  liability_other: '#a855f7',
}
const TYPE_LABELS: Record<string, string> = {
  cash: '现金', bank_card: '储蓄卡', savings_card: '储蓄卡', electronic_cash: '电子现金', alipay: '支付宝', wechat: '微信', investment: '投资',
  real_estate: '房产', vehicle: '车辆', insurance: '保险', social_fund: '社会保障', other: '其他资产',
  credit_card: '信用卡', loan: '贷款',
  liability_credit_card: '信用卡负债', liability_loan: '贷款负债',
}

const GROUP_LABELS: Record<string, string> = {
  savings_card: '储蓄卡', electronic_cash: '电子现金', investment: '投资账户',
  social_fund: '社会保障', cash: '现金', real_estate: '房产', vehicle: '车辆',
  insurance: '保险', credit_card: '信用卡', loan: '贷款', other: '其他资产',
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency, maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function compact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function accountIcon(type: string | null) {
  if (type === 'credit_card') return CreditCard
  if (type === 'loan') return Landmark
  if (type === 'real_estate') return Building2
  return WalletCards
}

function AccountRow({ row, onOpen, overallTotals, showGroupHeader = true, showDetails = true }: { row: ReadAccount; onOpen: (row: ReadAccount) => void; overallTotals: { assets: Record<string, number>; liabilities: Record<string, number> }; showGroupHeader?: boolean; showDetails?: boolean }) {
  const groupedRow = row as ReadAccount & { __sean_group_start?: boolean; __sean_group?: string; __sean_group_count?: number; __sean_group_totals?: { currency: string; value: number }[] }
  const displayType = seanAccountType(row)
  const Icon = accountIcon(displayType)
  const balance = accountBalance(row)
  const liability = LIABILITY_TYPES.has(displayType)
  const colorKey = liability
    ? `liability_${displayType || 'other'}`
    : seanAssetGroup(row)
  const groupColor = CATEGORY_COLORS[colorKey] || CATEGORY_COLORS.other
  const currency = (row.currency || 'CNY').toUpperCase()
  const creditUsageRate = displayType === 'credit_card' && typeof row.credit_limit === 'number' && row.credit_limit > 0
    ? Math.abs(balance) / row.credit_limit
    : null
  const groupCurrencyTotal = groupedRow.__sean_group_totals?.find((total) => total.currency === currency)?.value
  const groupShareRate = groupCurrencyTotal && groupCurrencyTotal > 0
    ? Math.abs(balance) / Math.abs(groupCurrencyTotal)
    : null
  const accountMeta = [
    row.bank_name || null,
    row.card_last_four ? `尾号 ${row.card_last_four}` : null,
    displayType === 'credit_card' && row.billing_day ? `账单日 ${row.billing_day} 日` : null,
    displayType === 'credit_card' && row.payment_due_day ? `还款日 ${row.payment_due_day} 日` : null,
  ].filter(Boolean).join(' · ')
  return <>
    {showGroupHeader && groupedRow.__sean_group_start ? <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-3 py-2 first:mt-0"><span className="text-xs font-semibold text-foreground">{GROUP_LABELS[groupedRow.__sean_group || 'other'] || '其他资产'} <span className="font-normal text-muted-foreground">{groupedRow.__sean_group_count || 0} 个账户</span></span><span className="flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">{groupedRow.__sean_group_totals?.map((total) => { const overall = liability ? overallTotals.liabilities[total.currency] : overallTotals.assets[total.currency]; return <span key={total.currency}>{money(total.value, total.currency)}{overall > 0 ? ` · 占${liability ? '总负债' : '总资产'} ${((total.value / overall) * 100).toFixed(1)}%` : ''}</span> })}</span></div> : null}
    <button
      type="button"
      onClick={() => showDetails && onOpen(row)}
      disabled={!showDetails}
      className={`group grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left ${showDetails ? 'transition-colors hover:bg-muted/60' : 'cursor-default'}`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ color: groupColor, backgroundColor: `${groupColor}1a` }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{row.name}</span>
          {row.hidden ? <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">已隐藏</span> : null}
        </span>
        {accountMeta ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{accountMeta}</span> : null}
        {groupShareRate !== null ? <span className="mt-1 block text-[10px] text-muted-foreground">占本组金额 <span className="font-mono text-foreground">{(groupShareRate * 100).toFixed(1)}%</span></span> : null}
        {creditUsageRate !== null ? <span className="mt-2 block max-w-sm">
          <span className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>额度使用</span><span className="font-mono">{(creditUsageRate * 100).toFixed(1)}%</span>
          </span>
          <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className={`block h-full rounded-full ${creditUsageRate >= 0.8 ? 'bg-expense' : creditUsageRate >= 0.5 ? 'bg-amber-500' : 'bg-income'}`}
              style={{ width: `${Math.min(creditUsageRate * 100, 100)}%` }}
            />
          </span>
        </span> : null}
      </span>
      <span className="flex min-w-0 items-center gap-1 text-right">
        <span className={`block whitespace-nowrap font-mono text-sm font-semibold ${liability ? 'text-expense' : balance >= 0 ? 'text-income' : 'text-expense'}`}>
          {liability ? '-' : ''}{money(Math.abs(balance), currency)}
        </span>
        {showDetails ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" /> : null}
      </span>
    </button>
  </>
}

function DedicatedAccountCard({ title, rows, onOpen, overallTotals }: { title: string; rows: ReadAccount[]; onOpen: (row: ReadAccount) => void; overallTotals: { assets: Record<string, number>; liabilities: Record<string, number> } }) {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const currency = (row.currency || 'CNY').toUpperCase()
    totals.set(currency, (totals.get(currency) || 0) + accountBalance(row))
  }
  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><CardTitle>{title}</CardTitle><CardDescription>{rows.length} 个账户</CardDescription></div>
        <div className="flex flex-wrap gap-x-2 font-mono text-sm text-muted-foreground">
          {[...totals].map(([currency, value]) => <span key={currency}>{money(value, currency)}{overallTotals.assets[currency] > 0 ? ` · 占总资产 ${((value / overallTotals.assets[currency]) * 100).toFixed(1)}%` : ''}</span>)}
        </div>
      </div>
    </CardHeader>
    <CardContent className="divide-y divide-border/60 p-2">
      {rows.map((row) => <AccountRow key={row.id} row={row} onOpen={onOpen} overallTotals={overallTotals} showGroupHeader={false} showDetails={false} />)}
    </CardContent>
  </Card>
}

export function SeanAssetsCenterPanel(props: Props) {
  const summary = useMemo(
    () => buildSeanAssetCenterSummary(props.accounts, props.baseCurrency, props.rates, props.overrides),
    [props.accounts, props.baseCurrency, props.rates, props.overrides],
  )
  const converted = summary.converted
  const overallTotals = useMemo(() => ({
    assets: Object.fromEntries(summary.buckets.map((bucket) => [bucket.currency, bucket.assetTotal])),
    liabilities: Object.fromEntries(summary.buckets.map((bucket) => [bucket.currency, Math.abs(bucket.liabilityTotal)])),
  }), [summary.buckets])
  const trend = props.history?.series ?? []
  const latestTrend = trend[trend.length - 1]
  const previousTrend = trend[trend.length - 2]
  const monthlyChange = latestTrend && previousTrend ? latestTrend.net_worth - previousTrend.net_worth : null
  const monthlyChangeRate = monthlyChange !== null && previousTrend && previousTrend.net_worth !== 0
    ? monthlyChange / Math.abs(previousTrend.net_worth)
    : null
  const debtRatio = converted && converted.assetTotal > 0 ? Math.abs(converted.liabilityTotal) / converted.assetTotal : 0
  const socialProtectionAccounts = summary.assets.filter((row) => seanAssetGroup(row) === 'social_fund')
  const insuranceAccounts = summary.assets.filter((row) => seanAssetGroup(row) === 'insurance')
  const regularAssets = summary.assets.filter((row) => !['social_fund', 'insurance'].includes(seanAssetGroup(row)))
  const composition = useMemo(() => {
    if (summary.buckets.length !== 1) return []
    const grouped = new Map<string, number>()
    for (const row of summary.assets) {
      const value = accountBalance(row)
      if (value <= 0) continue
      const type = seanAssetGroup(row)
      grouped.set(type, (grouped.get(type) || 0) + value)
    }
    return [...grouped].map(([type, value]) => ({
      name: TYPE_LABELS[type] || '其他资产',
      value,
      color: CATEGORY_COLORS[type] || CATEGORY_COLORS.other,
    }))
  }, [summary.assets])
  const compositionTotal = composition.reduce((sum, item) => sum + item.value, 0)

  return <div className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight">资产中心</h1><p className="mt-1 text-sm text-muted-foreground">独立的只读资产驾驶舱，不改变官方资产与账户管理功能。</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={props.onRefresh} disabled={props.loading}><RefreshCw className={`mr-2 h-4 w-4 ${props.loading ? 'animate-spin' : ''}`} />刷新</Button><Button onClick={props.onManageAccounts}>管理账户 <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
    </div>
    {props.error ? <Card><CardContent className="py-6 text-sm text-destructive">资产数据加载失败，请稍后重试。</CardContent></Card> : null}
    {summary.unknownTypeAccounts.length ? <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="py-4 text-sm"><p className="font-medium text-amber-700 dark:text-amber-400">账户类型需要检查</p><p className="mt-1 text-muted-foreground">{summary.unknownTypeAccounts.map((row) => row.name).join('、')} 未设置可识别类型，资产中心不会根据名称猜测其属于资产或负债。请在账户管理中确认类型。</p></CardContent></Card> : null}
    {!props.loading && props.accounts.length === 0 ? <Card><CardContent className="flex flex-col items-center py-14 text-center"><WalletCards className="mb-4 h-10 w-10 text-muted-foreground" /><p className="font-medium">还没有资产账户</p><p className="mt-1 text-sm text-muted-foreground">请先到官方资产页创建账户。</p><Button className="mt-5" onClick={props.onManageAccounts}>前往管理账户</Button></CardContent></Card> : null}
    {converted ? <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.12] via-card to-card"><CardContent className="grid gap-6 p-6 lg:grid-cols-[1.15fr_1fr] lg:p-8"><div><div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />净资产{summary.buckets.length > 1 ? ` · 折 ${converted.currency}` : ''}</div><p className={`mt-3 font-mono text-4xl font-bold tracking-tight sm:text-5xl ${converted.netWorth >= 0 ? 'text-income' : 'text-expense'}`}>{money(converted.netWorth, converted.currency)}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs"><span className="text-muted-foreground">较上月 <strong className={`ml-1 font-mono ${monthlyChange === null || monthlyChange >= 0 ? 'text-income' : 'text-expense'}`}>{monthlyChange === null ? '数据不足' : `${monthlyChange >= 0 ? '+' : ''}${money(monthlyChange, converted.currency)}${monthlyChangeRate === null ? '' : `（${monthlyChangeRate >= 0 ? '+' : ''}${(monthlyChangeRate * 100).toFixed(1)}%）`}`}</strong></span><span className="text-muted-foreground">资产负债率 <strong className="ml-1 font-mono text-foreground">{(debtRatio * 100).toFixed(1)}%</strong></span></div><p className="mt-3 text-xs text-muted-foreground">账户余额与官方资产页采用同一计算口径，隐藏账户仍计入净资产。</p></div><div className="grid grid-cols-2 gap-3 self-end"><div className="rounded-2xl border border-income/20 bg-background/60 p-4"><p className="text-xs text-muted-foreground">总资产</p><p className="mt-2 font-mono text-lg font-bold text-income">{money(converted.assetTotal, converted.currency)}</p></div><div className="rounded-2xl border border-expense/20 bg-background/60 p-4"><p className="text-xs text-muted-foreground">总负债</p><p className="mt-2 font-mono text-lg font-bold text-expense">-{money(Math.abs(converted.liabilityTotal), converted.currency)}</p></div></div>{converted.missingCurrencies.length ? <p className="lg:col-span-2 text-xs text-amber-600 dark:text-amber-500">缺少 {converted.missingCurrencies.join('、')} 汇率，这些币种未计入折算总额。</p> : null}</CardContent></Card> : summary.buckets.length ? <Card><CardHeader><CardTitle>分币种资产</CardTitle><CardDescription>尚未设置主币种，不同币种保持独立展示，不直接相加。</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{summary.buckets.map((bucket) => <div key={bucket.currency} className="rounded-2xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{bucket.currency} 净资产</p><p className={`mt-2 font-mono text-xl font-bold ${bucket.netWorth >= 0 ? 'text-income' : 'text-expense'}`}>{money(bucket.netWorth, bucket.currency)}</p><div className="mt-3 flex justify-between text-xs"><span className="text-income">资产 {money(bucket.assetTotal, bucket.currency)}</span><span className="text-expense">负债 {money(Math.abs(bucket.liabilityTotal), bucket.currency)}</span></div></div>)}</CardContent></Card> : null}
    {props.accounts.length ? <div className="grid gap-4 xl:grid-cols-5"><Card className="xl:col-span-3"><CardHeader><CardTitle>净资产趋势</CardTitle><CardDescription>最近 12 个月的净资产变化。</CardDescription></CardHeader><CardContent><div className="h-72">{trend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="seanAssetGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="bucket" tickFormatter={(value) => String(value).slice(5)} axisLine={false} tickLine={false}/><YAxis width={52} tickFormatter={compact} axisLine={false} tickLine={false}/><Tooltip formatter={((value: number) => [money(value, props.baseCurrency || summary.buckets[0]?.currency || 'CNY'), '净资产']) as never} labelFormatter={(label) => `${label}`}/><Area type="monotone" dataKey="net_worth" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#seanAssetGradient)"/></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">暂无趋势数据</div>}</div></CardContent></Card><Card className="xl:col-span-2"><CardHeader><CardTitle>资产构成</CardTitle><CardDescription>{summary.buckets.length === 1 ? '只展示正余额资产，负债单独列示。' : '多币种账户不按原值混合，构成请查看下方分币种账户。'}</CardDescription></CardHeader><CardContent><div className="h-52">{composition.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={composition} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3}>{composition.map((item) => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip formatter={((value: number, name: string) => [money(value, summary.buckets[0]?.currency || 'CNY'), name]) as never}/></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{summary.buckets.length > 1 ? '多币种构成保持独立' : '暂无可展示资产'}</div>}</div><div className="grid gap-2 sm:grid-cols-2">{composition.map((item) => <div key={item.name} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-2 text-xs"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }}/><span className="min-w-0 flex-1 truncate text-muted-foreground">{item.name}</span><span className="shrink-0 text-right"><span className="block font-mono font-medium text-foreground">{money(item.value, summary.buckets[0]?.currency || 'CNY')}</span><span className="block text-[10px] text-muted-foreground">{compositionTotal > 0 ? `${((item.value / compositionTotal) * 100).toFixed(1)}%` : '0.0%'}</span></span></div>)}</div></CardContent></Card></div> : null}
    {props.accounts.length ? <div className="grid items-start gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>资产账户</CardTitle><CardDescription>{regularAssets.length} 个账户，按余额体量排列。</CardDescription></CardHeader><CardContent className="divide-y divide-border/60 p-2">{regularAssets.length ? regularAssets.map((row) => <AccountRow key={row.id} row={row} onOpen={props.onOpenAccount} overallTotals={overallTotals}/>) : <p className="p-6 text-sm text-muted-foreground">暂无普通资产账户。</p>}</CardContent></Card>
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>负债账户</CardTitle><CardDescription>信用卡和贷款独立展示。</CardDescription></CardHeader><CardContent className="divide-y divide-border/60 p-2">{summary.liabilities.length ? summary.liabilities.map((row) => <AccountRow key={row.id} row={row} onOpen={props.onOpenAccount} overallTotals={overallTotals}/>) : <p className="p-6 text-sm text-muted-foreground">目前没有负债账户。</p>}</CardContent></Card>
        {socialProtectionAccounts.length ? <DedicatedAccountCard title="社会保障" rows={socialProtectionAccounts} onOpen={props.onOpenAccount} overallTotals={overallTotals} /> : null}
        {insuranceAccounts.length ? <DedicatedAccountCard title="保险" rows={insuranceAccounts} onOpen={props.onOpenAccount} overallTotals={overallTotals} /> : null}
      </div>
    </div> : null}
  </div>
}
