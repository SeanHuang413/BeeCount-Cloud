import { Button } from '@beecount/ui'
import { useSeanReportData } from './sean_shared/useSeanReportData'
import { SeanReportScope } from './sean_shared/SeanReportScope'


import { AccountSpendingTrend, SeanMonthlyComparisonPanel } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'


function twelveMonthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()
}

export function SeanMonthlyComparisonPage() {
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const { transactions, accounts, loading, error, load, metadata, scopeKey } = useSeanReportData({ token, ledgerId: activeLedgerId, currency, accounts: true, range: () => ({ dateFrom: twelveMonthStart() }) })
  if (!activeLedgerId) return <div className="mx-auto max-w-[1440px] py-10 text-sm text-muted-foreground">请选择账本后查看此功能。</div>
  return <div className="mx-auto max-w-[1440px]">
    <div className="mb-3 flex justify-end"><Button variant="outline" disabled={loading} onClick={() => void load()}>刷新数据</Button></div><SeanReportScope metadata={metadata}/><SeanMonthlyComparisonPanel key={scopeKey} transactions={transactions} currency={currency} loading={loading} error={error} />
    <div className="mt-5"><AccountSpendingTrend key={scopeKey} transactions={transactions} accounts={accounts} currency={currency} loading={loading} error={error} now={metadata?.refreshedAt} /></div>
  </div>
}
