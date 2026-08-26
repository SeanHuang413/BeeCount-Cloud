import { useCallback, useEffect, useState } from 'react'
import { fetchWorkspaceAccounts, fetchWorkspaceTransactions, type WorkspaceAccount, type WorkspaceTransaction } from '@beecount/api-client'
import { SeanCashflowCalendarPanel } from '@beecount/web-features'
import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

const PAGE_SIZE = 500
export function SeanCashflowCalendarPage() {
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const [transactions, setTransactions] = useState<WorkspaceTransaction[]>([])
  const [accounts, setAccounts] = useState<WorkspaceAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    if (!activeLedgerId) { setTransactions([]); setAccounts([]); return }
    setLoading(true); setError(false)
    try {
      const from = new Date(); from.setMonth(from.getMonth() - 12)
      const rows: WorkspaceTransaction[] = []
      for (let offset = 0; offset < 10000; offset += PAGE_SIZE) {
        const page = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId, dateFrom: from.toISOString(), limit: PAGE_SIZE, offset })
        rows.push(...page.items)
        if (rows.length >= page.total || page.items.length < PAGE_SIZE) break
      }
      const accountRows = await fetchWorkspaceAccounts(token, { limit: PAGE_SIZE })
      setTransactions(rows); setAccounts(accountRows)
    } catch { setTransactions([]); setAccounts([]); setError(true) }
    finally { setLoading(false) }
  }, [token, activeLedgerId])
  useEffect(() => { void load() }, [load])
  useSyncRefresh(() => { void load() })
  return <SeanCashflowCalendarPanel transactions={transactions} accounts={accounts} currency={currency} loading={loading} error={error} onRefresh={() => void load()} />
}
