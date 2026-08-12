import { useCallback, useEffect, useState } from 'react'

import { fetchNetWorthHistory, type NetWorthHistory } from '@beecount/api-client'
import { SeanAssetTrendsPanel } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'

export function SeanAssetTrendsPage() {
  const { token } = useAuth()
  const { currency } = useLedgers()
  const [history, setHistory] = useState<NetWorthHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try { setHistory(await fetchNetWorthHistory(token, { tzOffsetMinutes: -new Date().getTimezoneOffset() })) }
    catch { setHistory(null); setError(true) }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])
  useSyncRefresh(() => { void load() })
  return <SeanAssetTrendsPanel history={history} currency={currency} loading={loading} error={error} onRefresh={() => void load()} />
}
