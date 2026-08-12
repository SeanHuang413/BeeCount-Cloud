import { useCallback, useEffect, useState } from 'react'

import { fetchWorkspaceTransactions, type WorkspaceTransaction } from '@beecount/api-client'
import { SeanSpendInsightsPanel, type SeanSpendInsightPeriod } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

const PAGE_SIZE = 500
const MAX_PAGES = 20

function dateRangeFor(period: SeanSpendInsightPeriod): { dateFrom?: string; dateTo?: string } {
  if (period === 'all') return {}
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'last-month') {
    start.setMonth(start.getMonth() - 1)
    return { dateFrom: start.toISOString(), dateTo: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() }
  }
  const months = period === 'three-months' ? 3 : period === 'six-months' ? 6 : period === 'twelve-months' ? 12 : 1
  start.setMonth(start.getMonth() - (months - 1))
  return { dateFrom: start.toISOString(), dateTo: now.toISOString() }
}

export function SeanSpendInsightsPage() {
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const [transactions, setTransactions] = useState<WorkspaceTransaction[]>([])
  const [period, setPeriod] = useState<SeanSpendInsightPeriod>('month')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!activeLedgerId) { setTransactions([]); return }
    setLoading(true); setError(false)
    try {
      const rows: WorkspaceTransaction[] = []
      const range = dateRangeFor(period)
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const response = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId, ...range, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
        rows.push(...response.items)
        if (rows.length >= response.total || response.items.length < PAGE_SIZE) break
      }
      setTransactions(rows)
    } catch { setTransactions([]); setError(true) } finally { setLoading(false) }
  }, [token, activeLedgerId, period])

  useEffect(() => { void load() }, [load])
  useSyncRefresh(() => { void load() })
  return <SeanSpendInsightsPanel transactions={transactions} currency={currency} period={period} onPeriodChange={setPeriod} loading={loading} error={error} onRefresh={() => void load()} />
}
