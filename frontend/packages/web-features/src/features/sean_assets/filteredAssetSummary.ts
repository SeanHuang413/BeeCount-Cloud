import type { ExchangeRateOverride, ExchangeRatesResponse, ReadAccount } from '@beecount/api-client'

import { buildSeanAssetCenterSummary, seanAccountType } from './assetCenter'

export function buildFilteredAssetSummary(
  accounts: ReadAccount[],
  baseCurrency: string,
  rates: ExchangeRatesResponse | null,
  overrides: ExchangeRateOverride[],
) {
  const summarize = (rows: ReadAccount[]) => buildSeanAssetCenterSummary(rows, baseCurrency, rates, overrides)
  const retained = accounts.filter((row) => !['social_fund', 'insurance'].includes(seanAccountType(row)))
  return {
    summary: summarize(retained),
    excluded: [
      { label: '社会保障', summary: summarize(accounts.filter((row) => seanAccountType(row) === 'social_fund')) },
      { label: '保险', summary: summarize(accounts.filter((row) => seanAccountType(row) === 'insurance')) },
    ],
  }
}
