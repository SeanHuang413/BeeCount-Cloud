import type { ExchangeRateOverride, ExchangeRatesResponse, ReadAccount } from '@beecount/api-client'

import {
  accountBalance,
  effectiveRateToBase,
  LIABILITY_TYPES,
  splitByCurrency,
} from '../../lib/assetAggregation'

export type SeanAssetCurrencyBucket = {
  currency: string
  assetTotal: number
  liabilityTotal: number
  netWorth: number
  accounts: ReadAccount[]
}

export type SeanAssetCenterSummary = {
  buckets: SeanAssetCurrencyBucket[]
  converted: null | {
    currency: string
    assetTotal: number
    liabilityTotal: number
    netWorth: number
    missingCurrencies: string[]
  }
  assets: ReadAccount[]
  liabilities: ReadAccount[]
  liquidAssets: ReadAccount[]
  unknownTypeAccounts: ReadAccount[]
}

const LIQUID_TYPES = new Set(['cash', 'bank_card', 'alipay', 'wechat'])
const KNOWN_TYPES = new Set(['cash', 'bank_card', 'credit_card', 'alipay', 'wechat', 'investment', 'real_estate', 'vehicle', 'insurance', 'social_fund', 'loan', 'other'])

export function seanAccountType(account: ReadAccount): string {
  const explicit = account.account_type || ''
  if (KNOWN_TYPES.has(explicit)) return explicit
  const name = `${account.name || ''} ${account.bank_name || ''}`
  if (/信用卡/i.test(name)) return 'credit_card'
  if (/储蓄卡|借记卡/i.test(name)) return 'bank_card'
  if (/投资|基金|股票|证券|理财/i.test(name)) return 'investment'
  if (/支付宝|余额宝/i.test(name)) return 'alipay'
  if (/微信|零钱通/i.test(name)) return 'wechat'
  if (/公积金|社保|社会保险|医保|医疗保险/i.test(name)) return 'social_fund'
  if (/现金|钱包/i.test(name)) return 'cash'
  if (/房产|住房/i.test(name)) return 'real_estate'
  if (/车辆|汽车/i.test(name)) return 'vehicle'
  if (/保险/i.test(name)) return 'insurance'
  if (/贷款|借款|房贷|车贷/i.test(name)) return 'loan'
  return ''
}

export function seanAssetGroup(account: ReadAccount): string {
  const type = seanAccountType(account)
  if (type === 'bank_card') return 'savings_card'
  if (type === 'alipay' || type === 'wechat') return 'electronic_cash'
  return type || 'other'
}

function seanCurrencySummary(accounts: ReadAccount[]) {
  let assetTotal = 0
  let liabilityTotal = 0
  for (const account of accounts) {
    const balance = accountBalance(account)
    if (LIABILITY_TYPES.has(seanAccountType(account))) liabilityTotal -= Math.abs(balance)
    else assetTotal += balance
  }
  return { assetTotal, liabilityTotal, netWorth: assetTotal + liabilityTotal }
}

const MAJOR_BANK_PATTERNS = [
  /中国工商银行|工商银行|工商|工行/i,
  /中国农业银行|农业银行|农行/i,
  /中国银行|中行/i,
  /中国建设银行|建设银行|建行/i,
]

export function bankAccountPriority(account: ReadAccount): number {
  const type = seanAccountType(account)
  if (type !== 'bank_card' && type !== 'credit_card') return 100
  const identity = `${account.bank_name || ''} ${account.name || ''}`
  const majorBankIndex = MAJOR_BANK_PATTERNS.findIndex((pattern) => pattern.test(identity))
  return majorBankIndex === -1 ? 50 : majorBankIndex
}

function accountOrder(a: ReadAccount, b: ReadAccount): number {
  const groupOrder: Record<string, number> = {
    savings_card: 0, credit_card: 0, cash: 60, electronic_cash: 70,
    investment: 80, social_fund: 81, real_estate: 82, vehicle: 83,
    insurance: 84, loan: 85, other: 90,
  }
  const aGroup = seanAssetGroup(a)
  const bGroup = seanAssetGroup(b)
  return (groupOrder[aGroup] ?? 90) - (groupOrder[bGroup] ?? 90)
    || bankAccountPriority(a) - bankAccountPriority(b)
    || Math.abs(accountBalance(b)) - Math.abs(accountBalance(a))
}

function markGroupStarts(accounts: ReadAccount[]): ReadAccount[] {
  return accounts.map((account, index) => {
    const group = seanAssetGroup(account)
    const groupRows = accounts.filter((row) => seanAssetGroup(row) === group)
    const totals = new Map<string, number>()
    for (const row of groupRows) {
      const currency = (row.currency || 'CNY').toUpperCase()
      const value = LIABILITY_TYPES.has(seanAccountType(row)) ? Math.abs(accountBalance(row)) : accountBalance(row)
      totals.set(currency, (totals.get(currency) || 0) + value)
    }
    return {
      ...account,
      __sean_group_start: index === 0 || seanAssetGroup(accounts[index - 1]) !== group,
      __sean_group: group,
      __sean_group_count: groupRows.length,
      __sean_group_totals: [...totals].map(([currency, value]) => ({ currency, value })),
    }
  })
}

export function buildSeanAssetCenterSummary(
  accounts: ReadAccount[],
  baseCurrency: string,
  rates: ExchangeRatesResponse | null,
  overrides: ExchangeRateOverride[],
): SeanAssetCenterSummary {
  const buckets = [...splitByCurrency(accounts).entries()]
    .map(([currency, rows]) => ({ currency, ...seanCurrencySummary(rows), accounts: rows }))
    .sort(
      (a, b) =>
        Math.abs(b.assetTotal) + Math.abs(b.liabilityTotal) -
        (Math.abs(a.assetTotal) + Math.abs(a.liabilityTotal)),
    )
  const base = baseCurrency.trim().toUpperCase()
  let converted: SeanAssetCenterSummary['converted'] = null
  if (base && buckets.length) {
    let assetTotal = 0
    let liabilityTotal = 0
    const missingCurrencies: string[] = []
    for (const bucket of buckets) {
      const effective = effectiveRateToBase(bucket.currency, base, rates, overrides)
      if (!effective) {
        missingCurrencies.push(bucket.currency)
        continue
      }
      assetTotal += bucket.assetTotal * effective.rate
      liabilityTotal += bucket.liabilityTotal * effective.rate
    }
    converted = {
      currency: base,
      assetTotal,
      liabilityTotal,
      netWorth: assetTotal + liabilityTotal,
      missingCurrencies,
    }
  } else if (buckets.length === 1) {
    const only = buckets[0]
    converted = {
      currency: only.currency,
      assetTotal: only.assetTotal,
      liabilityTotal: only.liabilityTotal,
      netWorth: only.netWorth,
      missingCurrencies: [],
    }
  }
  return {
    buckets,
    converted,
    assets: markGroupStarts(accounts
      .filter((row) => !LIABILITY_TYPES.has(seanAccountType(row)))
      .sort(accountOrder)),
    liabilities: markGroupStarts(accounts
      .filter((row) => LIABILITY_TYPES.has(seanAccountType(row)))
      .sort(accountOrder)),
    liquidAssets: accounts
      .filter((row) => LIQUID_TYPES.has(seanAccountType(row)) && accountBalance(row) > 0)
      .sort((a, b) => accountBalance(b) - accountBalance(a)),
    unknownTypeAccounts: accounts.filter((row) => !seanAccountType(row)),
  }
}
