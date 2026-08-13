import type { WorkspaceTransaction } from '@beecount/api-client'

export type SeanTransferFlow = { key: string; from: string; to: string; amount: number; count: number; latestAt: string; transactions: WorkspaceTransaction[] }
export type SeanTransferAccountFlow = { name: string; incoming: number; outgoing: number; net: number; count: number }
export type SeanTransferReport = { total: number; count: number; largest: WorkspaceTransaction | null; flows: SeanTransferFlow[]; accounts: SeanTransferAccountFlow[] }

function amountOf(tx: WorkspaceTransaction): number {
  const amount = Number(tx.amount)
  return Number.isFinite(amount) ? Math.abs(amount) : 0
}

export function analyzeTransferFlows(transactions: WorkspaceTransaction[]): SeanTransferReport {
  const transfers = transactions.filter((tx) => tx.tx_type === 'transfer' && amountOf(tx) > 0)
  const flowMap = new Map<string, SeanTransferFlow>()
  const accountMap = new Map<string, SeanTransferAccountFlow>()
  let largest: WorkspaceTransaction | null = null
  const account = (name: string) => {
    const existing = accountMap.get(name)
    if (existing) return existing
    const created = { name, incoming: 0, outgoing: 0, net: 0, count: 0 }
    accountMap.set(name, created)
    return created
  }
  for (const tx of transfers) {
    const amount = amountOf(tx)
    const from = (tx.from_account_name || tx.account_name || '未知转出账户').trim()
    const to = (tx.to_account_name || '未知转入账户').trim()
    const key = `${from}\u0000${to}`
    const flow = flowMap.get(key) || { key, from, to, amount: 0, count: 0, latestAt: '', transactions: [] }
    flow.amount += amount; flow.count += 1; flow.latestAt = flow.latestAt > tx.happened_at ? flow.latestAt : tx.happened_at; flow.transactions.push(tx); flowMap.set(key, flow)
    const source = account(from); source.outgoing += amount; source.net -= amount; source.count += 1
    const target = account(to); target.incoming += amount; target.net += amount; target.count += 1
    if (!largest || amount > amountOf(largest)) largest = tx
  }
  return { total: transfers.reduce((sum, tx) => sum + amountOf(tx), 0), count: transfers.length, largest, flows: [...flowMap.values()].sort((a, b) => b.amount - a.amount || b.count - a.count), accounts: [...accountMap.values()].sort((a, b) => Math.abs(b.net) - Math.abs(a.net)) }
}
