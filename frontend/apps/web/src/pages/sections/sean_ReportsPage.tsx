import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { fetchWorkspaceAccounts, fetchWorkspaceCategories, fetchWorkspaceTransactions, type WorkspaceAccount, type WorkspaceCategory, type WorkspaceTransaction } from '@beecount/api-client'
import { SeanReportCenterPanel } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

const PAGE_SIZE = 500
const MAX_PAGES = 20
export type SeanReportPeriod = 'month' | 'last-month' | 'three-months' | 'six-months' | 'twelve-months' | 'all'

function dateRangeFor(period: SeanReportPeriod): { dateFrom?: string; dateTo?: string } {
  if (period === 'all') return {}
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'last-month') {
    start.setMonth(start.getMonth() - 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() }
  }
  if (period === 'three-months') start.setMonth(start.getMonth() - 2)
  if (period === 'six-months') start.setMonth(start.getMonth() - 5)
  if (period === 'twelve-months') start.setMonth(start.getMonth() - 11)
  return { dateFrom: start.toISOString(), dateTo: now.toISOString() }
}

export function SeanReportsPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const [transactions, setTransactions] = useState<WorkspaceTransaction[]>([])
  const [accounts, setAccounts] = useState<WorkspaceAccount[]>([])
  const [categories, setCategories] = useState<WorkspaceCategory[]>([])
  const [period, setPeriod] = useState<SeanReportPeriod>('month')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    if (!activeLedgerId) { setTransactions([]); setAccounts([]); setCategories([]); return }
    setLoading(true); setError(false)
    try {
      const range = dateRangeFor(period)
      const rows: WorkspaceTransaction[] = []
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const response = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId, ...range, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
        rows.push(...response.items)
        if (rows.length >= response.total || response.items.length < PAGE_SIZE) break
      }
      const categoryRows = await fetchWorkspaceCategories(token, { limit: PAGE_SIZE })
      setTransactions(rows); setCategories(categoryRows)
    } catch { setTransactions([]); setAccounts([]); setCategories([]); setError(true) } finally { setLoading(false) }
  }, [token, activeLedgerId, period])
  useEffect(() => { void load() }, [load])
  useSyncRefresh(() => { void load() })
  return <SeanReportCenterPanel transactions={transactions} accounts={accounts} categories={categories} currency={currency} period={period} onPeriodChange={setPeriod} loading={loading} error={error} onRefresh={() => void load()} onOpenTransactions={(query) => navigate(`/app/transactions${query ? `?q=${encodeURIComponent(query)}` : ''}`)} onOpenAssets={() => navigate('/app/accounts')} />
}
