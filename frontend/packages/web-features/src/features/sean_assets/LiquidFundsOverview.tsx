import { ReportHelp } from '../../lib/ReportHelp'
import { useMemo } from 'react'
import type { ExchangeRateOverride, ExchangeRatesResponse, ReadAccount } from '@beecount/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beecount/ui'
import { buildLiquidFundsSummary } from './liquidFunds'

type Props = { accounts: ReadAccount[]; baseCurrency: string; rates: ExchangeRatesResponse | null; overrides: ExchangeRateOverride[] }

export function LiquidFundsOverview(props: Props) {
  const summary = useMemo(() => buildLiquidFundsSummary(props.accounts, props.baseCurrency, props.rates, props.overrides),
    [props.accounts, props.baseCurrency, props.rates, props.overrides])
  const totals = summary.converted ? [summary.converted] : summary.buckets
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between gap-2">流动资金净额<ReportHelp label="流动资金口径说明" text="纳入现金、储蓄卡、支付宝、微信和信用卡，隐藏账户仍计入。投资、房产、车辆、社保、保险及贷款不参与。净额 = 流动资金 − 信用卡欠款 + 溢缴款，保留储蓄等账户的负余额。溢缴款不等于现金，净额未扣除未来生活费及贷款还款。" /></CardTitle>
      <CardDescription>{summary.accountCount} 个账户</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {totals.map((total) => <div key={total.currency} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '流动资金净额', value: total.netFunds, color: total.netFunds >= 0 ? 'text-income' : 'text-expense' },
          { label: '流动资金', value: total.liquidFunds, color: total.liquidFunds >= 0 ? 'text-income' : 'text-expense' },
          { label: '信用卡欠款', value: total.creditDebt, color: 'text-expense' },
          { label: '信用卡溢缴款', value: total.creditOverpayment, color: 'text-income' },
        ].map((item) => <div key={item.label} className="rounded-xl bg-muted/30 p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className={`mt-2 break-all font-mono text-xl font-bold ${item.color}`}>{total.currency} {item.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>)}
      </div>)}
      {!summary.accountCount ? <p className="text-xs text-muted-foreground">暂无符合此口径的账户。</p> : null}
      {!summary.converted && summary.buckets.length > 1 ? <p className="text-xs text-muted-foreground">未设置主币种，各币种独立展示，不直接相加。</p> : null}
      {summary.missingCurrencies.length ? <p className="text-xs text-expense">缺少 {summary.missingCurrencies.join('、')} 汇率，这些币种未计入上述总额。</p> : null}
      {summary.unknownAccountNames.length ? <p className="text-xs text-muted-foreground">{summary.unknownAccountNames.join('、')} 的账户类型无法识别，未计入此口径。</p> : null}
    </CardContent>
  </Card>
}
