import type { ExchangeRateOverride, ExchangeRatesResponse, ReadAccount } from '@beecount/api-client'
import { accountBalance, effectiveRateToBase, splitByCurrency } from '../../lib/assetAggregation'
import { seanAccountType } from './assetCenter'

const LIQUID_TYPES = new Set(['cash', 'bank_card', 'alipay', 'wechat'])

export type LiquidFundsTotal = {
  currency: string
  liquidFunds: number
  creditDebt: number
  creditOverpayment: number
  netFunds: number
}

export function buildLiquidFundsSummary(
  accounts: ReadAccount[],
  baseCurrency: string,
  rates: ExchangeRatesResponse | null,
  overrides: ExchangeRateOverride[],
) {
  const included = accounts.filter((row) => LIQUID_TYPES.has(seanAccountType(row)) || seanAccountType(row) === 'credit_card')
  const buckets: LiquidFundsTotal[] = [...splitByCurrency(included)].map(([currency, rows]) => {
    let liquidFunds = 0
    let creditDebt = 0
    let creditOverpayment = 0
    for (const row of rows) {
      const balance = accountBalance(row)
      if (seanAccountType(row) !== 'credit_card') liquidFunds += balance
      else if (balance < 0) creditDebt -= balance
      else creditOverpayment += balance
    }
    return { currency, liquidFunds, creditDebt, creditOverpayment, netFunds: liquidFunds - creditDebt + creditOverpayment }
  })
  const base = baseCurrency.trim().toUpperCase()
  const missingCurrencies: string[] = []
  let converted: LiquidFundsTotal | null = null
  if (base) {
    converted = { currency: base, liquidFunds: 0, creditDebt: 0, creditOverpayment: 0, netFunds: 0 }
    for (const bucket of buckets) {
      const rate = effectiveRateToBase(bucket.currency, base, rates, overrides)
      if (!rate) { missingCurrencies.push(bucket.currency); continue }
      converted.liquidFunds += bucket.liquidFunds * rate.rate
      converted.creditDebt += bucket.creditDebt * rate.rate
      converted.creditOverpayment += bucket.creditOverpayment * rate.rate
    }
    converted.netFunds = converted.liquidFunds - converted.creditDebt + converted.creditOverpayment
  }
  return { buckets, converted, missingCurrencies, accountCount: included.length,
    unknownAccountNames: accounts.filter((row) => !seanAccountType(row)).map((row) => row.name) }
}
