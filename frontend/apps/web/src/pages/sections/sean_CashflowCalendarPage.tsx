import { useSeanReportData } from './sean_shared/useSeanReportData'
import { SeanReportScope } from './sean_shared/SeanReportScope'

import { SeanCashflowCalendarPanel } from '@beecount/web-features'
import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'

export function SeanCashflowCalendarPage() {
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const { transactions, accounts, loading, error, load, metadata, scopeKey } = useSeanReportData({ token, ledgerId: activeLedgerId, currency, range: () => { const from = new Date(); from.setMonth(from.getMonth() - 12); return { dateFrom: from.toISOString() } }, accounts: true, originalCurrency: true })
  if (!activeLedgerId) return <div className="mx-auto max-w-[1440px] py-10 text-sm text-muted-foreground">请选择账本后查看此功能。</div>
  return <div className="mx-auto max-w-[1440px]"><SeanReportScope metadata={metadata}/><SeanCashflowCalendarPanel key={scopeKey} transactions={transactions} accounts={accounts} currency={currency} loading={loading} error={error} onRefresh={() => void load()} /></div>
}
