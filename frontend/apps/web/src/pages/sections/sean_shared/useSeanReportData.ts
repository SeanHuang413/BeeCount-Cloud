import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchReadBudgets, type ReadBudget, type WorkspaceAccount, type WorkspaceCategory } from '@beecount/api-client'
import { prepareReportTransactions } from '@beecount/web-features'
import { useSyncRefresh } from '../../../context/SyncSocketContext'
import { readReportAccounts, readReportCategories, readReportTransactions, type ReportRange } from './readReportData'

type Options = { token: string; ledgerId: string | null; currency: string; periodKey?: string;
  range: () => ReportRange; accounts?: boolean; categories?: boolean; budgets?: boolean; originalCurrency?: boolean }
type Data = NonNullable<Awaited<ReturnType<typeof readReportTransactions>>> & {
  accounts: WorkspaceAccount[]; categories: WorkspaceCategory[]; budgets: ReadBudget[];
  entityTruncated: boolean; scope: ReportRange; refreshedAt: Date }

export function useSeanReportData(options: Options) {
  const { token, ledgerId, currency, periodKey = '', accounts = false, categories = false, budgets = false, originalCurrency = false } = options
  const key = JSON.stringify([token, ledgerId, currency, periodKey, accounts, categories, budgets, originalCurrency])
  const rangeRef = useRef(options.range); rangeRef.current = options.range
  const generation = useRef(0)
  const [result, setResult] = useState<{ key: string; data: Data } | null>(null)
  const [status, setStatus] = useState({ key: '', loading: false, error: false })
  const load = useCallback(async () => {
    const request = ++generation.current
    const current = () => generation.current === request
    setResult(null); setStatus({ key, loading: Boolean(ledgerId), error: false })
    if (!ledgerId) return
    const now = new Date()
    const requested = rangeRef.current()
    const scope = { ...requested, dateTo: requested.dateTo && new Date(requested.dateTo) < now ? requested.dateTo : now.toISOString() }
    try {
      const [tx, accountRows, categoryRows, budgetRows] = await Promise.all([
        readReportTransactions(token, ledgerId, scope, current),
        accounts ? readReportAccounts(token, current) : null,
        categories ? readReportCategories(token, ledgerId, current) : null,
        budgets ? fetchReadBudgets(token, ledgerId) : [] as ReadBudget[],
      ])
      if (!current() || !tx) return
      setResult({ key, data: { ...tx, accounts: accountRows?.items ?? [], categories: categoryRows?.items ?? [],
        budgets: budgetRows, entityTruncated: Boolean(accountRows?.truncated || categoryRows?.truncated), scope, refreshedAt: now } })
    } catch { if (current()) setStatus({ key, loading: false, error: true }) }
    finally { if (current()) setStatus((old) => ({ ...old, loading: false })) }
  }, [key, token, ledgerId, accounts, categories, budgets])
  useEffect(() => { void load(); return () => { generation.current++ } }, [load])
  useSyncRefresh(() => { void load() })
  const data = result?.key === key ? result.data : null
  const prepared = useMemo(() => prepareReportTransactions(data?.transactions ?? [], currency, data?.refreshedAt), [data, currency])
  return { transactions: originalCurrency ? data?.transactions ?? [] : prepared.transactions,
    accounts: data?.accounts ?? [], categories: data?.categories ?? [], budgets: data?.budgets ?? [],
    loading: Boolean(ledgerId) && (status.key !== key || status.loading), error: status.key === key && status.error,
    load, scopeKey: key, metadata: data ? { ...data, ignoredCount: originalCurrency ? 0 : prepared.ignoredCount,
      ignoredCurrencies: originalCurrency ? [] : prepared.ignoredCurrencies, invalidCount: originalCurrency ? 0 : prepared.invalidCount } : null }
}
