import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWorkspaceAccounts, fetchWorkspaceTransactions, type WorkspaceAccount, type WorkspaceTransaction } from '@beecount/api-client'
import { SeanAccountReconciliationPanel } from '@beecount/web-features'
import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'
import { dispatchOpenNewTx } from '../../lib/txDialogEvents'

const PAGE_SIZE = 500
export function SeanAccountReconciliationPage() {
  const navigate = useNavigate(); const { token } = useAuth(); const { activeLedgerId } = useLedgers()
  const [accounts, setAccounts] = useState<WorkspaceAccount[]>([]); const [transactions, setTransactions] = useState<WorkspaceTransaction[]>([])
  const [loading, setLoading] = useState(false); const [error, setError] = useState(false)
  const load = useCallback(async () => {
    if (!activeLedgerId) { setAccounts([]); setTransactions([]); return }
    setLoading(true); setError(false)
    try {
      const from = new Date(); from.setDate(from.getDate() - 90)
      const rows: WorkspaceTransaction[] = []
      for (let offset = 0; offset < 10000; offset += PAGE_SIZE) {
        const page = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId, dateFrom: from.toISOString(), limit: PAGE_SIZE, offset })
        rows.push(...page.items); if (rows.length >= page.total || page.items.length < PAGE_SIZE) break
      }
      setAccounts(await fetchWorkspaceAccounts(token, { limit: PAGE_SIZE })); setTransactions(rows)
    } catch { setAccounts([]); setTransactions([]); setError(true) } finally { setLoading(false) }
  }, [token, activeLedgerId])
  useEffect(() => { void load() }, [load]); useSyncRefresh(() => { void load() })
  const addTransaction = () => { navigate('/app/transactions'); setTimeout(() => dispatchOpenNewTx({ ledgerId: activeLedgerId || undefined }), 50) }
  return <SeanAccountReconciliationPanel accounts={accounts} transactions={transactions} loading={loading} error={error} onRefresh={() => void load()} onOpenTransactions={(query) => navigate(`/app/transactions${query ? `?q=${encodeURIComponent(query)}` : ''}`)} onAddTransaction={addTransaction}/>
}
