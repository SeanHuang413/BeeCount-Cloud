import type { WorkspaceCategory, WorkspaceTransaction } from '@beecount/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@beecount/ui'
import { FolderTree } from 'lucide-react'

import { analyzeCategoryStructure } from './analyzeCategoryStructure'

type Props = {
  transactions: WorkspaceTransaction[]
  categories: WorkspaceCategory[]
  currency: string
}

function money(value: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}

export function CategoryStructureCard({ transactions, categories, currency }: Props) {
  const rows = analyzeCategoryStructure(transactions, categories)
  const total = rows.reduce((sum, row) => sum + row.expense, 0)
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><FolderTree className="h-5 w-5 text-primary" />分类消费结构</CardTitle>
      <CardDescription>按一级分类归集支出，并展开显示二级分类、金额、占比和笔数。</CardDescription>
    </CardHeader>
    <CardContent>
      {rows.length ? <div className="divide-y divide-border/70">
        {rows.map((row) => <div key={row.name} className="py-3">
          <div className="flex w-full items-center justify-between gap-3">
            <span className="min-w-0"><span className="block truncate font-medium">{row.name}</span><span className="text-xs text-muted-foreground">{row.count} 笔 · {total ? (row.expense / total * 100).toFixed(1) : '0.0'}%</span></span>
            <span className="shrink-0 font-mono text-sm font-semibold text-expense">-{money(row.expense, currency)}</span>
          </div>
          {row.children.length ? <div className="mt-2 space-y-1 border-l border-border/70 pl-3">
            {row.children.map((child) => <div key={child.name} className="flex w-full items-center justify-between gap-3 py-1 text-sm">
              <span className="truncate text-muted-foreground">{child.name}<span className="ml-1 text-xs">{child.count} 笔 · {row.expense ? (child.expense / row.expense * 100).toFixed(1) : '0.0'}%</span></span>
              <span className="shrink-0 font-mono text-expense">-{money(child.expense, currency)}</span>
            </div>)}
          </div> : null}
        </div>)}
      </div> : <p className="py-6 text-sm text-muted-foreground">当前时间范围内没有可统计的支出分类。</p>}
    </CardContent>
  </Card>
}
