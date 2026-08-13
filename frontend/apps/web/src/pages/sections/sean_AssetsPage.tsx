import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  fetchExchangeRateOverrides,
  fetchExchangeRates,
  fetchNetWorthHistory,
  fetchWorkspaceAccounts,
  type ExchangeRateOverride,
  type ExchangeRatesResponse,
  type NetWorthHistory,
  type WorkspaceAccount,
} from '@beecount/api-client'
import { SeanAssetsCenterPanel } from '@beecount/web-features'

import { useAuth } from '../../context/AuthContext'
import { useSyncRefresh } from '../../context/SyncSocketContext'
import { dispatchOpenDetailAccount } from '../../lib/txDialogEvents'

export function SeanAssetsPage() {
  const navigate = useNavigate()
  const { token, profileMe } = useAuth()
  const baseCurrency = profileMe?.primary_currency || ''
  const [accounts, setAccounts] = useState<WorkspaceAccount[]>([])
  const [history, setHistory] = useState<NetWorthHistory | null>(null)
  const [rates, setRates] = useState<ExchangeRatesResponse | null>(null)
  const [overrides, setOverrides] = useState<ExchangeRateOverride[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [accountRows, historyRows] = await Promise.all([
        fetchWorkspaceAccounts(token, { limit: 500 }),
        fetchNetWorthHistory(token, { tzOffsetMinutes: -new Date().getTimezoneOffset() }).catch(() => null),
      ])
      setAccounts(accountRows)
      setHistory(historyRows)
      if (baseCurrency && new Set(accountRows.map((row) => (row.currency || 'CNY').toUpperCase())).size > 1) {
        const [rateRows, overrideRows] = await Promise.all([
          fetchExchangeRates(token, baseCurrency).catch(() => null),
          fetchExchangeRateOverrides(token).catch(() => []),
        ])
        setRates(rateRows)
        setOverrides(overrideRows)
      } else {
        setRates(null)
        setOverrides([])
      }
    } catch {
      setAccounts([])
      setHistory(null)
      setRates(null)
      setOverrides([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [token, baseCurrency])

  useEffect(() => { void load() }, [load])
  useSyncRefresh(() => { void load() })

  return <SeanAssetsCenterPanel
    accounts={accounts}
    history={history}
    baseCurrency={baseCurrency}
    rates={rates}
    overrides={overrides}
    loading={loading}
    error={error}
    onRefresh={() => void load()}
    onOpenAccount={(account) => dispatchOpenDetailAccount(account as WorkspaceAccount, { defaultScope: 'all' })}
    onManageAccounts={() => navigate('/app/accounts')}
  />
}
