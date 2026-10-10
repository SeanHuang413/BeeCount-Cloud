import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchWorkspaceCategories, fetchWorkspaceTransactions, type WorkspaceCategory, type WorkspaceTransaction } from '@beecount/api-client'
import { SeanCategoryTrendsPanel } from '@beecount/web-features'
import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

const PAGE_SIZE = 500
const MAX_ROWS = 10000
type Data = { ledgerId: string; transactions: WorkspaceTransaction[]; categories: WorkspaceCategory[];
  total: number; truncated: boolean; categoryTruncated: boolean; now: Date }

export function SeanCategoryTrendsPage() {
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const generation = useRef(0)
  const emptyNow = useRef(new Date())
  const load = useCallback(async () => {
    const request = ++generation.current
    setData(null)
    setError(false)
    if (!activeLedgerId) { setLoading(false); return }
    setLoading(true)
    const now = new Date()
    const dateFrom = new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString()
    try {
      const [transactionData, categoryData] = await Promise.all([
        (async () => {
          const transactions: WorkspaceTransaction[] = []
          let total = 0
          for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
            const page = await fetchWorkspaceTransactions(token, { ledgerId: activeLedgerId,
              dateFrom, dateTo: now.toISOString(), limit: PAGE_SIZE, offset })
            if (request !== generation.current) return null
            total = Math.max(total, page.total)
            transactions.push(...page.items)
            if (transactions.length >= page.total || page.items.length < PAGE_SIZE) break
          }
          return { transactions, total, truncated: transactions.length < total }
        })(),
        (async () => {
          const categories: WorkspaceCategory[] = []
          let fullLastPage = false
          for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
            const page = await fetchWorkspaceCategories(token, { ledgerId: activeLedgerId, limit: PAGE_SIZE, offset })
            if (request !== generation.current) return null
            categories.push(...page)
            fullLastPage = page.length === PAGE_SIZE
            if (!fullLastPage) break
          }
          return { categories, categoryTruncated: fullLastPage && categories.length >= MAX_ROWS }
        })(),
      ])
      if (request === generation.current && transactionData && categoryData) {
        setData({ ledgerId: activeLedgerId, ...transactionData, ...categoryData, now })
      }
    } catch {
      if (request === generation.current) setError(true)
    } finally {
      if (request === generation.current) setLoading(false)
    }
  }, [token, activeLedgerId])
  useEffect(() => { void load(); return () => { generation.current += 1 } }, [load])
  useSyncRefresh(() => { void load() })
  const current = data?.ledgerId === activeLedgerId ? data : null
  if (!activeLedgerId) return <div className="mx-auto max-w-[1440px] py-10 text-sm text-muted-foreground">请选择账本后查看分类消费趋势。</div>
  return <div className="mx-auto max-w-[1440px]">
    <SeanCategoryTrendsPanel key={activeLedgerId ?? 'none'} transactions={current?.transactions ?? []}
      categories={current?.categories ?? []} currency={currency} now={current?.now ?? emptyNow.current}
      loading={loading} error={error} total={current?.total ?? 0} truncated={current?.truncated ?? false}
      categoryTruncated={current?.categoryTruncated ?? false} onRefresh={() => void load()} />
  </div>
}
