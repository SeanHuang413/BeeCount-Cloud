import { useCallback, useEffect, useState } from 'react'
import { fetchWorkspaceTransactions, type WorkspaceTransaction } from '@beecount/api-client'
import { SeanAnomalyDetectionPanel } from '@beecount/web-features'
import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

const PAGE_SIZE = 500
export function SeanAnomalyDetectionPage() {
  const { token } = useAuth(); const { activeLedgerId, currency } = useLedgers()
  const [transactions, setTransactions] = useState<WorkspaceTransaction[]>([])
  const [loading, setLoading] = useState(false); const [error, setError] = useState(false)
  const load = useCallback(async () => {
    if (!activeLedgerId) { setTransactions([]); return }
    setLoading(true); setError(false)
    try {
      const from = new Date(); from.setMonth(from.getMonth() - 12)
      const rows: WorkspaceTransaction[] = []
      for (let offset = 0; offset < 10000; offset += PAGE_SIZE) {
        const page = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId, dateFrom: from.toISOString(), limit: PAGE_SIZE, offset })
        rows.push(...page.items); if (rows.length >= page.total || page.items.length < PAGE_SIZE) break
      }
      setTransactions(rows)
    } catch { setTransactions([]); setError(true) } finally { setLoading(false) }
  }, [token, activeLedgerId])
  useEffect(() => { void load() }, [load]); useSyncRefresh(() => { void load() })
  return <SeanAnomalyDetectionPanel transactions={transactions} currency={currency} loading={loading} error={error} onRefresh={() => void load()}/>
}
