import { useCallback, useEffect, useState } from 'react'

import { fetchReadBudgets, fetchWorkspaceCategories, fetchWorkspaceTransactions, type ReadBudget, type WorkspaceCategory, type WorkspaceTransaction } from '@beecount/api-client'
import { BudgetReimbursementCard, MonthSwitcher } from '@beecount/web-features'
import { Button, Card, CardContent } from '@beecount/ui'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

const PAGE_SIZE = 500
const MAX_PAGES = 20

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(month: string): { dateFrom: string; dateTo: string } {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(year, monthNumber - 1, 1)
  const end = new Date(year, monthNumber, 1)
  const now = new Date()
  return { dateFrom: start.toISOString(), dateTo: (end > now ? now : end).toISOString() }
}

export function SeanActualSpendPage() {
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const [transactions, setTransactions] = useState<WorkspaceTransaction[]>([])
  const [categories, setCategories] = useState<WorkspaceCategory[]>([])
  const [budgets, setBudgets] = useState<ReadBudget[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const load = useCallback(async () => {
    if (!activeLedgerId) { setTransactions([]); setCategories([]); setBudgets([]); return }
    setLoading(true); setError(false)
    try {
      const { dateFrom, dateTo } = monthRange(selectedMonth)
      const rows: WorkspaceTransaction[] = []
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const response = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId, dateFrom, dateTo, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
        rows.push(...response.items)
        if (rows.length >= response.total || response.items.length < PAGE_SIZE) break
      }
      const [categoryRows, budgetRows] = await Promise.all([fetchWorkspaceCategories(token, { limit: PAGE_SIZE }), fetchReadBudgets(token, activeLedgerId)])
      setTransactions(rows); setCategories(categoryRows); setBudgets(budgetRows)
    } catch { setTransactions([]); setCategories([]); setBudgets([]); setError(true) } finally { setLoading(false) }
  }, [token, activeLedgerId, selectedMonth])
  useEffect(() => { void load() }, [load])
  useSyncRefresh(() => { void load() })
  return <div className="mx-auto max-w-[1440px] space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">实际支出</h1><p className="mt-1 text-sm text-muted-foreground">按月查看预算支出扣除报销后的只读结果，不改变 App 或预算原始数据。</p></div><div className="flex items-center gap-2"><MonthSwitcher value={selectedMonth} max={currentMonth()} onChange={setSelectedMonth}/><Button variant="outline" disabled={loading} onClick={() => void load()}>刷新数据</Button></div></div>{error ? <Card><CardContent className="py-8 text-sm text-destructive">数据加载失败，请稍后重试。</CardContent></Card> : null}<BudgetReimbursementCard transactions={transactions} categories={categories} budgets={budgets} currency={currency} /></div>
}
