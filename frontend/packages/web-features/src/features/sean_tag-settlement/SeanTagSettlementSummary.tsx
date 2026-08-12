import { useT } from '@beecount/ui'

export type SeanTagSettlement = {
  income: number
  expense: number
}

export function calculateSeanTagSettlement({ income, expense }: SeanTagSettlement): number {
  return income - expense
}

/**
 * Read-only settlement for a synchronized tag. It deliberately persists
 * nothing: the result is always recalculated from the cloud transaction data.
 */
export function SeanTagSettlementSummary({ income, expense }: SeanTagSettlement) {
  const t = useT()
  const result = calculateSeanTagSettlement({ income, expense })
  const formatted = result.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const tone = result > 0 ? 'text-income' : result < 0 ? 'text-expense' : 'text-muted-foreground'

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {t('sean.tagSettlement.balance')}
      </div>
      <div className={`mt-0.5 font-mono text-lg font-bold tabular-nums ${tone}`}>
        {result > 0 ? '+' : ''}{formatted}
      </div>
    </div>
  )
}

export function SeanTagSettlementInline({ income, expense }: SeanTagSettlement) {
  const t = useT()
  const result = calculateSeanTagSettlement({ income, expense })
  const tone = result > 0 ? 'text-income' : result < 0 ? 'text-expense' : 'text-muted-foreground'
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      <span className={`font-mono font-semibold tabular-nums ${tone}`}>
        {result > 0 ? '+' : ''}{result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </span>
  )
}
