import { useCallback, useEffect, useRef, useState } from 'react'
import { readReportAccounts } from './sean_shared/readReportData'

import { fetchNetWorthHistory, type NetWorthHistory } from '@beecount/api-client'
import { SeanAssetTrendsPanel } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

export function SeanAssetTrendsPage() {
  const { token, profileMe } = useAuth()
  const primaryCurrency = profileMe?.primary_currency || ''
  const [currency, setCurrency] = useState(primaryCurrency)
  const generation = useRef(0)
  const [history, setHistory] = useState<NetWorthHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    const request = ++generation.current
    setHistory(null); setLoading(true); setError(false)
    try {
      const [rows, accounts] = await Promise.all([
        fetchNetWorthHistory(token, { tzOffsetMinutes: -new Date().getTimezoneOffset() }),
        primaryCurrency ? null : readReportAccounts(token, () => request === generation.current),
      ])
      if (request !== generation.current) return
      const currencies = new Set((accounts?.items ?? []).map((account) => (account.currency || 'CNY').toUpperCase()))
      const base = primaryCurrency || (!accounts?.truncated && currencies.size === 1 ? [...currencies][0] : '')
      setCurrency(base); setHistory(base ? rows : null)
    }
    catch { if (request === generation.current) { setHistory(null); setError(true) } }
    finally { if (request === generation.current) setLoading(false) }
  }, [token, primaryCurrency])
  useEffect(() => { void load(); return () => { generation.current++ } }, [load])
  useSyncRefresh(() => { void load() })
  return <div className="mx-auto max-w-[1440px]">{!loading && !error && !currency ? <p className="mb-4 text-sm text-muted-foreground">请在个人资料设置本位币，以便正确展示跨币种资产趋势。</p> : null}<SeanAssetTrendsPanel key={currency} history={history} currency={currency || 'CNY'} loading={loading} error={error} onRefresh={() => void load()} /></div>
}
