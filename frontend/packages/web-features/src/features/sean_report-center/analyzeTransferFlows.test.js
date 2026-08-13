import { describe, expect, it } from 'vitest'
import { analyzeTransferFlows } from './analyzeTransferFlows'

const transfer = (id, from, to, amount) => ({ id, tx_type: 'transfer', from_account_name: from, to_account_name: to, amount, happened_at: `2026-08-${id.padStart(2, '0')}T00:00:00Z` })

describe('transfer flow report', () => {
  it('aggregates internal paths without income or expense semantics', () => {
    const report = analyzeTransferFlows([transfer('01', '银行卡', '支付宝', 100), transfer('02', '银行卡', '支付宝', 50), { ...transfer('03', '支付宝', '现金', 20), exclude_from_stats: true }, { ...transfer('04', '银行卡', '支付宝', 999), tx_type: 'expense' }])
    expect(report.total).toBe(170); expect(report.count).toBe(3)
    expect(report.flows[0]).toMatchObject({ from: '银行卡', to: '支付宝', amount: 150, count: 2 })
    expect(report.accounts.find((item) => item.name === '银行卡').net).toBe(-150)
    expect(report.accounts.find((item) => item.name === '支付宝').net).toBe(130)
  })
  it('uses ledger base amount instead of native currency amount', () => {
    const report = analyzeTransferFlows([{ ...transfer('05', 'A', 'B', 100), native_amount: 999 }])
    expect(report.total).toBe(100)
    expect(report.flows[0].amount).toBe(100)
  })
})
