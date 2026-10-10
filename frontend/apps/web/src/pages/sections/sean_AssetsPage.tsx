import { readReportAccounts } from './sean_shared/readReportData'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  fetchExchangeRateOverrides,
  fetchExchangeRates,
  fetchNetWorthHistory,
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
  const generation = useRef(0)
  const [accountTruncated, setAccountTruncated] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    const request = ++generation.current
    const current = () => request === generation.current
    setAccounts([]); setHistory(null); setRates(null); setOverrides([]); setAccountTruncated(false)
    setLoading(true)
    setError(false)
    try {
      const [accountRows, historyRows] = await Promise.all([
        readReportAccounts(token, current),
        fetchNetWorthHistory(token, { tzOffsetMinutes: -new Date().getTimezoneOffset() }).catch(() => null),
      ])
      if (!current() || !accountRows) return
      let rateRows: ExchangeRatesResponse | null = null
      let overrideRows: ExchangeRateOverride[] = []
      if (baseCurrency && accountRows.items.some((row) => (row.currency || 'CNY').toUpperCase() !== baseCurrency.toUpperCase())) {
        ;[rateRows, overrideRows] = await Promise.all([
          fetchExchangeRates(token, baseCurrency).catch(() => null),
          fetchExchangeRateOverrides(token).catch(() => []),
        ])
      }
      if (!current()) return
      setAccounts(accountRows.items); setAccountTruncated(accountRows.truncated)
      setHistory(historyRows); setRates(rateRows); setOverrides(overrideRows)
    } catch {
      if (!current()) return
      setAccounts([])
      setHistory(null)
      setRates(null)
      setOverrides([])
      setError(true)
    } finally {
      if (current()) setLoading(false)
    }
  }, [token, baseCurrency])

  useEffect(() => { void load(); return () => { generation.current++ } }, [load])
  useSyncRefresh(() => { void load() })

  return <div className="mx-auto max-w-[1440px]">{accountTruncated ? <p className="mb-4 text-sm text-expense">账户达到 10,000 条读取上限，资产总览可能不完整。</p> : null}<SeanAssetsCenterPanel
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
  /></div>
}
