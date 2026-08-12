import type { NetWorthHistory, NetWorthHistorySeriesItem } from '@beecount/api-client'

export type SeanAssetTrendRow = NetWorthHistorySeriesItem & {
  netWorthChange: number | null
  assetsChange: number | null
  liabilitiesChange: number | null
}

export function buildSeanAssetTrendRows(history: NetWorthHistory | null): SeanAssetTrendRow[] {
  const chronological = (history?.series ?? []).slice(-12)
  return chronological.map((item, index) => {
    const previous = chronological[index - 1]
    return {
      ...item,
      netWorthChange: previous ? item.net_worth - previous.net_worth : null,
      assetsChange: previous ? item.assets - previous.assets : null,
      liabilitiesChange: previous ? Math.abs(item.liabilities) - Math.abs(previous.liabilities) : null,
    }
  }).reverse()
}
