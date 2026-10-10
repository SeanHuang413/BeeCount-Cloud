import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@beecount/api-client', () => ({ fetchWorkspaceTransactions: vi.fn(), fetchWorkspaceAccounts: vi.fn(), fetchWorkspaceCategories: vi.fn() }))
import { fetchWorkspaceTransactions, fetchWorkspaceCategories } from '@beecount/api-client'
import { readReportTransactions, readReportEntities, readReportCategories } from './readReportData'

describe('bounded Sean report reads', () => {
  beforeEach(() => vi.clearAllMocks())
  it('reports truncation and preserves the requested ledger/date range', async () => {
    fetchWorkspaceTransactions.mockImplementation(async (_, options) => ({ items: Array.from({ length: 500 }, (_, i) => ({ id: `${options.offset + i}` })), total: 10001 }))
    const result = await readReportTransactions('token', 'shared-ledger', { dateFrom: '2026-01-01', dateTo: '2026-08-01' })
    expect(result).toMatchObject({ total: 10001, truncated: true })
    expect(result.transactions).toHaveLength(10000)
    expect(fetchWorkspaceTransactions).toHaveBeenCalledTimes(20)
    expect(fetchWorkspaceTransactions.mock.calls[0][1]).toMatchObject({ ledgerId: 'shared-ledger', dateFrom: '2026-01-01', dateTo: '2026-08-01' })
  })
  it('does not mark exactly 10000 transactions as truncated', async () => {
    fetchWorkspaceTransactions.mockResolvedValue({ items: Array(500).fill({ id: 'a' }), total: 10000 })
    expect((await readReportTransactions('token', 'ledger', {})).truncated).toBe(false)
  })
  it('ignores a response whose request scope is obsolete', async () => {
    let active = true
    fetchWorkspaceTransactions.mockImplementation(async () => { active = false; return { items: [{ id: 'old' }], total: 1 } })
    expect(await readReportTransactions('token', 'old-ledger', {}, () => active)).toBeNull()
    expect(fetchWorkspaceTransactions).toHaveBeenCalledTimes(1)
  })
  it('paginates categories in the selected shared ledger', async () => {
    fetchWorkspaceCategories.mockImplementation(async (_, options) => options.offset === 0 ? Array(500).fill({ id: 'a' }) : [{ id: 'last' }])
    const result = await readReportCategories('token', 'shared-ledger')
    expect(result.items).toHaveLength(501)
    expect(result.truncated).toBe(false)
    expect(fetchWorkspaceCategories.mock.calls[1][1]).toMatchObject({ ledgerId: 'shared-ledger', offset: 500 })
  })
  it('flags entities when the last permitted page is full', async () => {
    expect((await readReportEntities(async () => Array(500).fill({}))).truncated).toBe(true)
  })
})
