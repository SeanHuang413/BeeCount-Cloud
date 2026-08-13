import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { fetchWorkspaceCategories, fetchWorkspaceTransactions, type WorkspaceCategory, type WorkspaceTransaction } from '@beecount/api-client'
import { SeanReportCenterPanel } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

const PAGE_SIZE = 500
const MAX_PAGES = 20
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
  const [transactions, setTransactions] = useState<WorkspaceTransaction[]>([])
  const [categories, setCategories] = useState<WorkspaceCategory[]>([])
  const [period, setPeriod] = useState<SeanReportPeriod>('month')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    if (!activeLedgerId) { setTransactions([]); setCategories([]); return }
    setLoading(true); setError(false)
    try {
      const range = dateRangeFor(period, selectedMonth)
      const rows: WorkspaceTransaction[] = []
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const response = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId, ...range, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
        rows.push(...response.items)
        if (rows.length >= response.total || response.items.length < PAGE_SIZE) break
      }
      setCategories(await fetchWorkspaceCategories(token, { limit: PAGE_SIZE }))
      setTransactions(rows)
    } catch { setTransactions([]); setCategories([]); setError(true) } finally { setLoading(false) }
  }, [token, activeLedgerId, period, selectedMonth])
  useEffect(() => { void load() }, [load])
  useSyncRefresh(() => { void load() })
  return <SeanReportCenterPanel transactions={transactions} categories={categories} currency={currency} period={period} onPeriodChange={setPeriod} selectedMonth={selectedMonth} onSelectedMonthChange={setSelectedMonth} loading={loading} error={error} onRefresh={() => void load()} onOpenTransactions={(query) => navigate(`/app/transactions${query ? `?q=${encodeURIComponent(query)}` : ''}`)} />
}
