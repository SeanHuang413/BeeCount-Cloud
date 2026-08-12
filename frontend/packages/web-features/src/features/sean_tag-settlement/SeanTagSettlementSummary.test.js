import { describe, expect, it } from 'vitest'

import { calculateSeanTagSettlement } from './SeanTagSettlementSummary'

describe('calculateSeanTagSettlement', () => {
  it('returns income minus expense without persisting a settlement', () => {
    expect(calculateSeanTagSettlement({ income: 680, expense: 500 })).toBe(180)
    expect(calculateSeanTagSettlement({ income: 0, expense: 99.5 })).toBe(-99.5)
  })
})
