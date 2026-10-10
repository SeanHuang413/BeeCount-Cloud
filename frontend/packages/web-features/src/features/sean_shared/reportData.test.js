import { describe, expect, it } from 'vitest'
import { localReportDay, prepareReportTransactions, reportAmount } from './reportData'

const tx = (id, extra = {}) => ({ id, happened_at: '2026-08-01T00:00:00Z', amount: 10, ...extra })
describe('read-only report currency and dates', () => {
  it('uses saved FX amounts, omits missing FX and retains historical base-currency rows', () => {
    const rows = [tx('old'), tx('fx', { currency_code: 'USD', native_amount: 72 }), tx('missing', { currency_code: 'usd' })]
    const result = prepareReportTransactions(rows, 'CNY', new Date('2026-09-01'))
    expect(result.transactions.map((row) => row.native_amount)).toEqual([10, 72])
    expect(result).toMatchObject({ ignoredCount: 1, ignoredCurrencies: ['USD'] })
    expect(rows[0]).not.toHaveProperty('native_amount')
  })
  it('retains zero snapshots and rejects invalid/future records', () => {
    expect(reportAmount(tx('zero', { native_amount: 0 }), 'CNY')).toBe(0)
    const result = prepareReportTransactions([tx('bad', { amount: NaN }), tx('bad-date', { happened_at: 'invalid' }), tx('future', { happened_at: '2027-01-01' })], 'CNY', new Date('2026-09-01'))
    expect(result.transactions).toEqual([])
    expect(result.invalidCount).toBe(3)
  })
  it('uses calendar dates in the browser timezone', () => {
    const local = new Date(2026, 7, 1, 0, 5)
    expect(localReportDay(local.toISOString())).toBe('2026-08-01')
    expect(localReportDay('invalid')).toBe('')
  })
})
