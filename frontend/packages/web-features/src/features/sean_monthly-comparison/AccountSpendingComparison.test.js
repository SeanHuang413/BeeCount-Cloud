import { describe, expect, it } from 'vitest'
import { accountLineColor, comparisonAccounts } from './AccountSpendingComparison'

describe('account comparison type filters', () => {
  const profiles = [
    { account: { id: 'bank' }, type: 'bank_card', total: 30 },
    { account: { id: 'card' }, type: 'credit_card', total: 20 },
    { account: { id: 'cash' }, type: 'cash', total: 10 },
  ]
  it('filters savings cards and credit cards without changing ranking', () => {
    expect(comparisonAccounts(profiles, 'all')).toEqual(profiles)
    expect(comparisonAccounts(profiles, 'bank_card').map(row => row.account.id)).toEqual(['bank'])
    expect(comparisonAccounts(profiles, 'credit_card').map(row => row.account.id)).toEqual(['card'])
    expect(comparisonAccounts([], 'credit_card')).toEqual([])
  })
  it('keeps each account color stable across filters and ordering', () => {
    const before = accountLineColor('bank')
    expect(accountLineColor(comparisonAccounts([...profiles].reverse(), 'bank_card')[0].account.id)).toBe(before)
    expect(accountLineColor('card')).not.toBe(before)
  })
})
