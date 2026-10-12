import { ReportHelp } from '../../lib/ReportHelp'
import { useMemo } from 'react'
import type { ExchangeRateOverride, ExchangeRatesResponse, ReadAccount } from '@beecount/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@beecount/ui'

import { buildFilteredAssetSummary } from './filteredAssetSummary'

type Props = {
  accounts: ReadAccount[]
  baseCurrency: string
  rates: ExchangeRatesResponse | null
  overrides: ExchangeRateOverride[]
}

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function FilteredAssetOverview(props: Props) {
  const { summary, excluded } = useMemo(
    () => buildFilteredAssetSummary(props.accounts, props.baseCurrency, props.rates, props.overrides),
    [props.accounts, props.baseCurrency, props.rates, props.overrides],
  )
  // Keep the empty retained set in the same currency as the complete overview.
  const emptyCurrency = props.baseCurrency.trim().toUpperCase()
    || (new Set(props.accounts.map((row) => (row.currency || 'CNY').toUpperCase())).size === 1
      ? (props.accounts[0]?.currency || 'CNY').toUpperCase() : '')
  const totals = summary.converted ? [summary.converted]
    : summary.buckets.length ? summary.buckets
    : emptyCurrency ? [{ currency: emptyCurrency, assetTotal: 0, liabilityTotal: 0, netWorth: 0 }] : []
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between gap-2">资产概览（不含社保与保险）<ReportHelp label="排除社保与保险口径说明" text="排除社会保障和保险账户，保留房产、车辆、投资及全部信用卡和贷款，隐藏账户仍计入。净资产 = 总资产 + 带符号负债余额，欠款为负、溢缴款为正。只展示当前金额；排除金额按原币展示，暂无此口径历史趋势或环比。" /></CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {totals.map((total) => <div key={total.currency} className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/30 p-4"><p className="text-xs text-muted-foreground">净资产</p><p className={`mt-2 break-all font-mono text-xl font-bold ${total.netWorth >= 0 ? 'text-income' : 'text-expense'}`}>{money(total.netWorth, total.currency)}</p></div>
        <div className="rounded-xl bg-muted/30 p-4"><p className="text-xs text-muted-foreground">总资产</p><p className="mt-2 break-all font-mono text-xl font-bold text-income">{money(total.assetTotal, total.currency)}</p></div>
        <div className="rounded-xl bg-muted/30 p-4"><p className="text-xs text-muted-foreground">总负债（带符号）</p><p className={`mt-2 break-all font-mono text-xl font-bold ${total.liabilityTotal > 0 ? 'text-income' : 'text-expense'}`}>{money(total.liabilityTotal, total.currency)}</p></div>
      </div>)}
      {!summary.buckets.length ? <p className="text-xs text-muted-foreground">排除后没有剩余账户。</p> : null}
      {!summary.converted && summary.buckets.length > 1 ? <p className="text-xs text-muted-foreground">未设置主币种，各币种独立展示，不直接相加。</p> : null}
      {summary.converted?.missingCurrencies.length ? <p className="text-xs text-expense">缺少 {summary.converted.missingCurrencies.join('、')} 汇率，这些币种未计入上述总额。</p> : null}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {excluded.map(({ label, summary: excludedSummary }) => <div key={label}>已排除{label}：<span className="font-mono text-foreground">{excludedSummary.buckets.length
          ? excludedSummary.buckets.map((bucket) => money(bucket.assetTotal, bucket.currency)).join(' / ')
          : money(0, emptyCurrency || 'CNY')}</span></div>)}
      </div>
    </CardContent>
  </Card>
}
