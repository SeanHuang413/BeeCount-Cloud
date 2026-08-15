import { useCallback, useEffect, useState } from 'react'

import { fetchWorkspaceTransactions, type WorkspaceTransaction } from '@beecount/api-client'
import { SeanMonthlyComparisonPanel } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

const PAGE_SIZE = 500
const MAX_PAGES = 20

function twelveMonthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()
}

export function SeanMonthlyComparisonPage() {
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const [transactions, setTransactions] = useState<WorkspaceTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    if (!activeLedgerId) { setTransactions([]); return }
    setLoading(true); setError(false)
    try {
      const rows: WorkspaceTransaction[] = []
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const response = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId, dateFrom: twelveMonthStart(), dateTo: new Date().toISOString(), limit: PAGE_SIZE, offset: page * PAGE_SIZE })
        rows.push(...response.items)
        if (rows.length >= response.total || response.items.length < PAGE_SIZE) break
      }
      setTransactions(rows)
    } catch { setTransactions([]); setError(true) } finally { setLoading(false) }
  }, [token, activeLedgerId])
  useEffect(() => { void load() }, [load])
  useSyncRefresh(() => { void load() })
  return <div className="mx-auto max-w-[1440px]">
    <SeanMonthlyComparisonPanel transactions={transactions} currency={currency} loading={loading} error={error} />
  </div>
}
