import { describe, expect, it } from 'vitest'

import { parseRoute, routePath } from './router'

describe('router path mapping', () => {
  it('parses login path', () => {
    expect(parseRoute('/login')).toEqual({ kind: 'login' })
    expect(parseRoute('/')).toEqual({ kind: 'login' })
  })

  it('parses app route with section', () => {
    expect(parseRoute('/app/ledger-1/transactions')).toEqual({
      kind: 'app',
      ledgerId: 'ledger-1',
      section: 'transactions'
    })
expect(parseRoute('/app/workspace/transactions')).toEqual({
      kind: 'app',
      ledgerId: '',
      section: 'transactions'
    })
    expect(parseRoute('/app/transactions')).toEqual({
      kind: 'app',
      ledgerId: '',
      section: 'transactions'
    })
    expect(parseRoute('/app/settings/health')).toEqual({
      kind: 'app',
      ledgerId: '',
      section: 'settings-health'
    })
    expect(parseRoute('/app/sean-cashflow-calendar')).toEqual({
      kind: 'app',
      ledgerId: '',
      section: 'sean-cashflow-calendar'
    })
    expect(parseRoute('/app/sean-anomaly-detection')).toEqual({
      kind: 'app',
      ledgerId: '',
      section: 'sean-anomaly-detection'
    })
    expect(parseRoute('/app/sean-account-reconciliation')).toEqual({
      kind: 'app',
      ledgerId: '',
      section: 'sean-account-reconciliation'
    })
  })

  it('falls back to overview for unknown section', () => {
    expect(parseRoute('/app/ledger-1/unknown')).toEqual({
      kind: 'app',
      ledgerId: 'ledger-1',
      section: 'transactions'
    })
  })

  it('creates path from app route', () => {
    expect(
      routePath({
        kind: 'app',
        ledgerId: 'ledger a',
        section: 'settings-devices'
      })
    ).toBe('/app/settings/devices')
    expect(
      routePath({
        kind: 'app',
        ledgerId: 'ledger a',
        section: 'settings-health'
      })
    ).toBe('/app/settings/health')
    expect(
      routePath({
        kind: 'app',
        ledgerId: '',
        section: 'sean-cashflow-calendar'
      })
    ).toBe('/app/sean-cashflow-calendar')
    expect(
      routePath({
        kind: 'app',
        ledgerId: '',
        section: 'sean-anomaly-detection'
      })
    ).toBe('/app/sean-anomaly-detection')
    expect(
      routePath({
        kind: 'app',
        ledgerId: '',
        section: 'sean-account-reconciliation'
      })
    ).toBe('/app/sean-account-reconciliation')
  })
})
