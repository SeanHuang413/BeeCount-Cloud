import { describe, expect, it } from 'vitest'
import { buildLiquidFundsSummary } from './liquidFunds'

const account = (name, balance, account_type, currency = 'CNY') => ({ id: name, name, balance, account_type, currency, initial_balance: 0 })
const build = (rows, base = 'CNY', rates = null, overrides = []) => buildLiquidFundsSummary(rows, base, rates, overrides)

describe('liquid funds net balance', () => {
  it('includes hidden funds and negative balances, and separates card debt from overpayments', () => {
    const rows = [account('现金', 100, 'cash'), { ...account('储蓄卡', 500, 'bank_card'), hidden: true },
      account('透支储蓄卡', -20, 'bank_card'), account('支付宝', 200, 'alipay'), account('微信', 300, 'wechat'),
      account('欠款卡', -400, 'credit_card'), account('溢缴卡', 50, 'credit_card'),
      ...['investment', 'real_estate', 'vehicle', 'social_fund', 'insurance', 'loan', 'other'].map(type => account(type, 9999, type))]
    expect(build(rows).converted).toEqual({ currency: 'CNY', liquidFunds: 1080, creditDebt: 400, creditOverpayment: 50, netFunds: 730 })
    expect(build(rows).accountCount).toBe(7)
  })
  it('uses official types first, existing fallback types, and excludes unrecognized accounts', () => {
    const result = build([account('工商银行信用卡', -10, null), account('微信零钱通', 20, null),
      account('现金投资', 999, 'investment'), account('未知', 100, null)])
    expect(result.converted.netFunds).toBe(10)
    expect(result.unknownAccountNames).toEqual(['未知'])
  })
  it('keeps original currencies separate and handles missing and manual rates', () => {
    const rows = [account('现金', 100, 'cash'), account('美元卡', -10, 'credit_card', 'USD'), account('美元现金', 20, 'cash', 'USD')]
    expect(build(rows, '').buckets.map(row => row.netFunds)).toEqual([100, 10])
    expect(build(rows).missingCurrencies).toEqual(['USD'])
    expect(build(rows).converted.netFunds).toBe(100)
    const rates = { rates: { USD: '0.125' } }
    expect(build(rows, 'CNY', rates).converted.netFunds).toBe(180)
    expect(build(rows, 'CNY', rates, [{ base_currency: 'CNY', quote_currency: 'USD', rate: '7' }]).converted.netFunds).toBe(170)
  })
  it('handles only credit cards, no eligible accounts and absent balance', () => {
    expect(build([account('卡', -100, 'credit_card')]).converted.netFunds).toBe(-100)
    expect(build([account('投资', 100, 'investment')]).accountCount).toBe(0)
    expect(build([]).converted.netFunds).toBe(0)
    expect(build([], '').buckets).toEqual([])
    expect(build([{ ...account('现金', undefined, 'cash'), initial_balance: 10 }]).converted.liquidFunds).toBe(10)
  })
})
