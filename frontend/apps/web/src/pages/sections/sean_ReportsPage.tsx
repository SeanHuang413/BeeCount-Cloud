import { useSeanReportData } from './sean_shared/useSeanReportData'
import { SeanReportScope } from './sean_shared/SeanReportScope'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { SeanReportCenterPanel } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'

export type SeanReportPeriod = 'month' | 'last-month' | 'three-months' | 'six-months' | 'twelve-months' | 'custom-month' | 'all'

function currentMonth(): string { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }
function dateRangeFor(period: SeanReportPeriod, selectedMonth: string): { dateFrom?: string; dateTo?: string } {
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
  const [period, setPeriod] = useState<SeanReportPeriod>('month')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const { transactions, categories, loading, error, load, metadata, scopeKey } = useSeanReportData({ token, ledgerId: activeLedgerId, currency, periodKey: `${period}:${selectedMonth}`, range: () => dateRangeFor(period, selectedMonth), categories: true })
  if (!activeLedgerId) return <div className="mx-auto max-w-[1440px] py-10 text-sm text-muted-foreground">请选择账本后查看此功能。</div>
  return <div className="mx-auto max-w-[1440px]"><SeanReportScope metadata={metadata}/><SeanReportCenterPanel key={scopeKey} transactions={transactions} categories={categories} currency={currency} period={period} onPeriodChange={setPeriod} selectedMonth={selectedMonth} onSelectedMonthChange={setSelectedMonth} loading={loading} error={error} onRefresh={() => void load()} onOpenTransactions={(query) => navigate(`/app/transactions${query ? `?q=${encodeURIComponent(query)}` : ''}`)} /></div>
}
