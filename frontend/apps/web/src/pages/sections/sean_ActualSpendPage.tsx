import { useSeanReportData } from './sean_shared/useSeanReportData'
import { SeanReportScope } from './sean_shared/SeanReportScope'
import { useState } from 'react'

import { BudgetReimbursementCard, MonthSwitcher } from '@beecount/web-features'
import { Button, Card, CardContent } from '@beecount/ui'

import { useAuth } from '../../context/AuthContext'
import { useLedgers } from '../../context/LedgersContext'


function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(month: string): { dateFrom: string; dateTo: string } {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(year, monthNumber - 1, 1)
  const end = new Date(year, monthNumber, 1)
  const now = new Date()
  return { dateFrom: start.toISOString(), dateTo: (end > now ? now : end).toISOString() }
}

export function SeanActualSpendPage() {
  const { token } = useAuth()
  const { activeLedgerId, currency } = useLedgers()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const { transactions, categories, budgets, loading, error, load, metadata, scopeKey } = useSeanReportData({ token, ledgerId: activeLedgerId, currency, periodKey: selectedMonth, range: () => monthRange(selectedMonth), categories: true, budgets: true })
  const nonCalendarBudgets = budgets.filter((budget) => budget.type === 'category' && budget.enabled && ((budget.period && budget.period !== 'monthly') || (budget.start_day && budget.start_day !== 1))).length
  if (!activeLedgerId) return <div className="mx-auto max-w-[1440px] py-10 text-sm text-muted-foreground">请选择账本后查看此功能。</div>
  return <div className="mx-auto max-w-[1440px] space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight">实际支出</h1><p className="mt-1 text-sm text-muted-foreground">按月查看预算支出扣除报销后的只读结果，不改变 App 或预算原始数据。</p></div><div className="flex items-center gap-2"><MonthSwitcher value={selectedMonth} max={currentMonth()} onChange={setSelectedMonth}/><Button variant="outline" disabled={loading} onClick={() => void load()}>刷新数据</Button></div></div>{error ? <Card><CardContent className="py-8 text-sm text-destructive">数据加载失败，请稍后重试。</CardContent></Card> : null}<SeanReportScope metadata={metadata}/>{loading ? <p className="text-sm text-muted-foreground">正在读取数据…</p> : null}{nonCalendarBudgets ? <p className="text-xs text-muted-foreground">本页按自然月统计，{nonCalendarBudgets} 个周预算、年预算或非每月 1 日开始的预算未展示，避免周期错配；请在官方预算页查看对应周期。</p> : null}<BudgetReimbursementCard key={scopeKey} transactions={transactions} categories={categories} budgets={budgets} currency={currency} /></div>
}
