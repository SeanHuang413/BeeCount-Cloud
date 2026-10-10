import { fetchWorkspaceTransactions, fetchWorkspaceCategories, fetchWorkspaceAccounts } from '@beecount/api-client'
import type { WorkspaceTransaction } from '@beecount/api-client'

export const REPORT_LIMIT = 10000
const PAGE_SIZE = 500
export type ReportRange = { dateFrom?: string; dateTo?: string }

export async function readReportTransactions(token: string, ledgerId: string, range: ReportRange, current = () => true) {
  const transactions: WorkspaceTransaction[] = []
  let total = 0
  for (let offset = 0; offset < REPORT_LIMIT; offset += PAGE_SIZE) {
    if (!current()) return null
    const page = await fetchWorkspaceTransactions(token, { ledgerId, ...range, limit: PAGE_SIZE, offset })
    if (!current()) return null
    total = Math.max(total, page.total)
    transactions.push(...page.items)
    if (transactions.length >= page.total || page.items.length < PAGE_SIZE) break
  }
  return { transactions, total, truncated: transactions.length < total }
}

export async function readReportEntities<T>(fetchPage: (offset: number) => Promise<T[]>, current = () => true) {
  const items: T[] = []
  let full = false
  for (let offset = 0; offset < REPORT_LIMIT; offset += PAGE_SIZE) {
    if (!current()) return null
    const page = await fetchPage(offset)
    if (!current()) return null
    items.push(...page); full = page.length === PAGE_SIZE
    if (!full) break
  }
  return { items, truncated: full && items.length >= REPORT_LIMIT }
}
export const readReportCategories = (token: string, ledgerId: string, current?: () => boolean) =>
  readReportEntities((offset) => fetchWorkspaceCategories(token, { ledgerId, limit: PAGE_SIZE, offset }), current)
export const readReportAccounts = (token: string, current?: () => boolean) =>
  readReportEntities((offset) => fetchWorkspaceAccounts(token, { limit: PAGE_SIZE, offset }), current)
