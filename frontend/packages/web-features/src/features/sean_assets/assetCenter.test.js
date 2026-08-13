import { describe, expect, it } from 'vitest'

import { buildSeanAssetCenterSummary, seanAccountType, seanAssetGroup } from './assetCenter'

const account = (id, currency, balance, account_type = 'bank_card') => ({
  id, name: id, currency, balance, account_type, initial_balance: 0, last_change_id: 1,
})

describe('Sean asset center summary', () => {
  it('keeps currencies separate when no base currency exists', () => {
    const result = buildSeanAssetCenterSummary(
      [account('cny', 'CNY', 1000), account('usd', 'USD', 100)], '', null, [],
    )
    expect(result.converted).toBeNull()
    expect(result.buckets.map((item) => item.netWorth).sort((a, b) => a - b)).toEqual([100, 1000])
  })

  it('converts with the shared rate contract and separates liabilities', () => {
    const result = buildSeanAssetCenterSummary(
      [account('cash', 'CNY', 1000), account('card', 'USD', -100, 'credit_card')],
      'CNY',
      { base: 'CNY', rate_date: '2026-08-13', source: 'test', fetched_at: '', stale: false, rates: { USD: '0.14' } },
      [],
    )
    expect(result.converted.netWorth).toBeCloseTo(285.714, 2)
    expect(result.assets).toHaveLength(1)
    expect(result.liabilities).toHaveLength(1)
    expect(result.liquidAssets).toHaveLength(1)
  })

  it('flags unknown account types without guessing from account names', () => {
    const result = buildSeanAssetCenterSummary([
      { ...account('未分类账户', 'CNY', -100), account_type: null },
    ], 'CNY', null, [])
    expect(result.unknownTypeAccounts.map((item) => item.name)).toEqual(['未分类账户'])
    expect(result.liabilities).toHaveLength(0)
  })

  it('uses clear account names as display-only fallback types', () => {
    expect(seanAccountType({ ...account('投资自由', 'CNY', 4500), account_type: null })).toBe('investment')
    expect(seanAccountType({ ...account('工商银行信用卡', 'CNY', 1200), account_type: null })).toBe('credit_card')
    expect(seanAccountType({ ...account('建设银行储蓄卡', 'CNY', 800), account_type: null })).toBe('bank_card')
    expect(seanAccountType({ ...account('支付宝(余额宝)', 'CNY', 300), account_type: null })).toBe('alipay')
  })

  it('keeps cash, savings cards and electronic cash in separate asset groups', () => {
    expect(seanAssetGroup({ ...account('现金钱包', 'CNY', 100), account_type: null })).toBe('cash')
    expect(seanAssetGroup({ ...account('建设银行储蓄卡', 'CNY', 100), account_type: null })).toBe('savings_card')
    expect(seanAssetGroup({ ...account('支付宝余额宝', 'CNY', 100), account_type: null })).toBe('electronic_cash')
    expect(seanAssetGroup({ ...account('微信零钱通', 'CNY', 100), account_type: null })).toBe('electronic_cash')
  })

  it('groups housing fund, social security and medical insurance as social protection', () => {
    expect(seanAssetGroup({ ...account('公积金', 'CNY', 100), account_type: null })).toBe('social_fund')
    expect(seanAssetGroup({ ...account('个人社保账户', 'CNY', 100), account_type: null })).toBe('social_fund')
    expect(seanAssetGroup({ ...account('医保个人账户', 'CNY', 100), account_type: null })).toBe('social_fund')
  })

  it('marks the first account in each visual group', () => {
    const result = buildSeanAssetCenterSummary([
      { ...account('工行储蓄卡', 'CNY', 100), account_type: null },
      { ...account('建行储蓄卡', 'CNY', 80), account_type: null },
      { ...account('支付宝', 'CNY', 60), account_type: null },
      { ...account('微信', 'CNY', 40), account_type: null },
      { ...account('投资自由', 'CNY', 20), account_type: null },
    ], 'CNY', null, [])
    const rows = result.assets
    expect(rows.map((row) => [row.name, row.__sean_group_start, row.__sean_group])).toEqual([
      ['工行储蓄卡', true, 'savings_card'],
      ['建行储蓄卡', false, 'savings_card'],
      ['支付宝', true, 'electronic_cash'],
      ['微信', false, 'electronic_cash'],
      ['投资自由', true, 'investment'],
    ])
    expect(rows[0].__sean_group_count).toBe(2)
    expect(rows[0].__sean_group_totals).toEqual([{ currency: 'CNY', value: 180 }])
    expect(rows[2].__sean_group_count).toBe(2)
    expect(rows[2].__sean_group_totals).toEqual([{ currency: 'CNY', value: 100 }])
  })

  it('moves inferred credit cards into liabilities and treats their balance as debt', () => {
    const result = buildSeanAssetCenterSummary([
      { ...account('工商银行储蓄卡', 'CNY', 5000), account_type: null },
      { ...account('工商银行信用卡', 'CNY', 1200), account_type: null },
    ], 'CNY', null, [])
    expect(result.assets.map((item) => item.name)).toEqual(['工商银行储蓄卡'])
    expect(result.liabilities.map((item) => item.name)).toEqual(['工商银行信用卡'])
    expect(result.converted).toMatchObject({ assetTotal: 5000, liabilityTotal: -1200, netWorth: 3800 })
  })

  it('prioritizes the four major banks before other card accounts', () => {
    const rows = [
      { ...account('招商储蓄卡', 'CNY', 9000), bank_name: '招商银行' },
      { ...account('建行储蓄卡', 'CNY', 100), bank_name: '中国建设银行' },
      { ...account('工行储蓄卡', 'CNY', 200), bank_name: '中国工商银行' },
      { ...account('中行储蓄卡', 'CNY', 300), bank_name: '中国银行' },
      { ...account('农行储蓄卡', 'CNY', 400), bank_name: '中国农业银行' },
    ]
    const result = buildSeanAssetCenterSummary(rows, 'CNY', null, [])
    expect(result.assets.map((item) => item.bank_name)).toEqual([
      '中国工商银行', '中国农业银行', '中国银行', '中国建设银行', '招商银行',
    ])
  })
})
