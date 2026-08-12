import type { WorkspaceTransaction } from '@beecount/api-client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@beecount/ui'

import type { SeanSpendInsight } from './analyzeSpendCandidates'

type Props = { insight: SeanSpendInsight | null; transactions: WorkspaceTransaction[]; currency: string; onOpenChange: (open: boolean) => void }

function money(value: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}

function amountOf(tx: WorkspaceTransaction): number { return Math.abs(Number(tx.native_amount ?? tx.amount) || 0) }
function normalizedNote(value: string | null): string { return (value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ') }

function matches(tx: WorkspaceTransaction, insight: SeanSpendInsight): boolean {
  if (tx.tx_type !== 'expense' || tx.exclude_from_stats || amountOf(tx) <= 0) return false
  return insight.kind === 'subscription' ? normalizedNote(tx.note) === insight.title : (tx.category_name || '').trim() === insight.title
}

export function SeanSpendInsightDetailsDialog({ insight, transactions, currency, onOpenChange }: Props) {
  const rows = insight ? transactions.filter((tx) => matches(tx, insight)).sort((a, b) => b.happened_at.localeCompare(a.happened_at)) : []
  const total = rows.reduce((sum, tx) => sum + amountOf(tx), 0)
  return <Dialog open={Boolean(insight)} onOpenChange={onOpenChange}><DialogContent className="max-h-[80vh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>{insight?.title || '相关交易'}</DialogTitle><DialogDescription>当前时间范围内、已计入统计的相关支出交易。</DialogDescription></DialogHeader>{rows.length ? <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm"><div><p className="text-xs text-muted-foreground">相关笔数</p><p className="mt-1 font-mono font-semibold">{rows.length}</p></div><div><p className="text-xs text-muted-foreground">累计支出</p><p className="mt-1 font-mono font-semibold text-expense">-{money(total, currency)}</p></div></div> : null}<div className="divide-y divide-border/70">{rows.map((tx) => <div key={tx.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate font-medium">{tx.note || tx.category_name || '未命名交易'}</p><p className="mt-1 text-xs text-muted-foreground">{tx.happened_at.slice(0, 10)}{tx.category_name ? ` · ${tx.category_name}` : ''}</p></div><span className="shrink-0 font-mono font-semibold text-expense">-{money(amountOf(tx), currency)}</span></div>)}{!rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">没有符合条件的交易。</p> : null}</div></DialogContent></Dialog>
}
