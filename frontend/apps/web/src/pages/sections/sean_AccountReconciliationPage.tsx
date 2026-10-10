import { useSeanReportData } from './sean_shared/useSeanReportData'
import { SeanReportScope } from './sean_shared/SeanReportScope'

import { useNavigate } from 'react-router-dom'
import { SeanAccountReconciliationPanel } from '@beecount/web-features'
import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { dispatchOpenNewTx } from '../../lib/txDialogEvents'

export function SeanAccountReconciliationPage() {
  const navigate = useNavigate(); const { token } = useAuth(); const { activeLedgerId, currency } = useLedgers()
  const { transactions, accounts, loading, error, load, metadata, scopeKey } = useSeanReportData({ token, ledgerId: activeLedgerId, currency, range: () => { const from = new Date(); from.setDate(from.getDate() - 90); return { dateFrom: from.toISOString() } }, accounts: true, originalCurrency: true })
  const addTransaction = () => { navigate('/app/transactions'); setTimeout(() => dispatchOpenNewTx({ ledgerId: activeLedgerId || undefined }), 50) }
  if (!activeLedgerId) return <div className="mx-auto max-w-[1440px] py-10 text-sm text-muted-foreground">请选择账本后查看此功能。</div>
  return <div className="mx-auto max-w-[1440px]"><SeanReportScope metadata={metadata}/><SeanAccountReconciliationPanel key={scopeKey} ledgerCurrency={currency} accounts={accounts} transactions={transactions} loading={loading} error={error} onRefresh={() => void load()} onOpenTransactions={(query) => navigate(`/app/transactions${query ? `?q=${encodeURIComponent(query)}` : ''}`)} onAddTransaction={addTransaction}/></div>
}
