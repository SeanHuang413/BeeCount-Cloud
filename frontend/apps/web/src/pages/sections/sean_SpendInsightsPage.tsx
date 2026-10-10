import { useSeanReportData } from './sean_shared/useSeanReportData'
import { SeanReportScope } from './sean_shared/SeanReportScope'
import { useState } from 'react'

import { SeanSpendInsightsPanel, type SeanSpendInsightPeriod } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'


function currentMonth(): string { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }
function dateRangeFor(period: SeanSpendInsightPeriod, selectedMonth: string): { dateFrom?: string; dateTo?: string } {
  if (period === 'all') return {}
  const now = new Date()
  if (period === 'custom-month') {
    const candidate = /^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth) ? selectedMonth : currentMonth()
    const safeMonth = candidate > currentMonth() ? currentMonth() : candidate
    const [year, month] = safeMonth.split('-').map(Number)
    return { dateFrom: new Date(year, month - 1, 1).toISOString(), dateTo: new Date(year, month, 1).toISOString() }
  }
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
  const [period, setPeriod] = useState<SeanSpendInsightPeriod>('month')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const { transactions, loading, error, load, metadata, scopeKey } = useSeanReportData({ token, ledgerId: activeLedgerId, currency, periodKey: `${period}:${selectedMonth}`, range: () => dateRangeFor(period, selectedMonth) })
  if (!activeLedgerId) return <div className="mx-auto max-w-[1440px] py-10 text-sm text-muted-foreground">请选择账本后查看此功能。</div>
  return <div className="mx-auto max-w-[1440px]"><SeanReportScope metadata={metadata}/><SeanSpendInsightsPanel key={scopeKey} transactions={transactions} currency={currency} period={period} onPeriodChange={setPeriod} selectedMonth={selectedMonth} onSelectedMonthChange={setSelectedMonth} loading={loading} error={error} onRefresh={() => void load()} /></div>
}
