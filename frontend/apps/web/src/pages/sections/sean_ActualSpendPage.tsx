import { useCallback, useEffect, useState } from 'react'

import { fetchReadBudgets, fetchWorkspaceCategories, fetchWorkspaceTransactions, type ReadBudget, type WorkspaceCategory, type WorkspaceTransaction } from '@beecount/api-client'
import { BudgetReimbursementCard } from '@beecount/web-features'
import { Button, Card, CardContent } from '@beecount/ui'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

const PAGE_SIZE = 500
const MAX_PAGES = 20

export function SeanActualSpendPage() {
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const [transactions, setTransactions] = useState<WorkspaceTransaction[]>([])
  const [categories, setCategories] = useState<WorkspaceCategory[]>([])
  const [budgets, setBudgets] = useState<ReadBudget[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    if (!activeLedgerId) { setTransactions([]); setCategories([]); setBudgets([]); return }
    setLoading(true); setError(false)
    try {
      const now = new Date()
      const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const rows: WorkspaceTransaction[] = []
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const response = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId, dateFrom, dateTo: now.toISOString(), limit: PAGE_SIZE, offset: page * PAGE_SIZE })
        rows.push(...response.items)
        if (rows.length >= response.total || response.items.length < PAGE_SIZE) break
      }
      const [categoryRows, budgetRows] = await Promise.all([fetchWorkspaceCategories(token, { limit: PAGE_SIZE }), fetchReadBudgets(token, activeLedgerId)])
      setTransactions(rows); setCategories(categoryRows); setBudgets(budgetRows)
    } catch { setTransactions([]); setCategories([]); setBudgets([]); setError(true) } finally { setLoading(false) }
  }, [token, activeLedgerId])
  useEffect(() => { void load() }, [load])
  useSyncRefresh(() => { void load() })
  return <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">实际支出</h1><p className="mt-1 text-sm text-muted-foreground">本月预算支出扣除报销后的只读视图，不改变 App 或官方预算。</p></div><Button variant="outline" disabled={loading} onClick={() => void load()}>刷新数据</Button></div>{error ? <Card><CardContent className="py-8 text-sm text-destructive">数据加载失败，请稍后重试。</CardContent></Card> : null}<BudgetReimbursementCard transactions={transactions} categories={categories} budgets={budgets} currency={currency} /></div>
}
