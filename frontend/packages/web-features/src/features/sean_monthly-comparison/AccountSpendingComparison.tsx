import { useState, type ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { analyzeAccountSpending } from './accountSpending'

export type AccountComparisonType = 'all' | 'bank_card' | 'credit_card'
type Profile = ReturnType<typeof analyzeAccountSpending>['profiles'][number]
export function comparisonAccounts(profiles: Profile[], type: AccountComparisonType) {
  return profiles.filter(row => type === 'all' || row.type === type)
}
export function accountLineColor(id: string) {
  let hash = 0
  for (const character of id) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0
  return `hsl(${hash % 360} 65% 45%)`
}

export function AccountSpendingComparison({ accountControl, result, currency, currentMonth, format }: {
  accountControl: ReactNode; result: ReturnType<typeof analyzeAccountSpending>; currency: string; currentMonth: string; format: (amount: number) => string
}) {
  const [type, setType] = useState<AccountComparisonType>('all')
  const [selection, setSelection] = useState<{ key: string; ids: string[] } | null>(null)
  const profiles = comparisonAccounts(result.profiles, type)
  const key = `${type}:${profiles.map(row => row.account.id).join('|')}`
  const ids = selection?.key === key ? selection.ids : profiles.slice(0, 5).map(row => row.account.id)
  const selected = profiles.filter(row => ids.includes(row.account.id))
  const chart = result.buckets.map(row => ({ month: row.month, values: Object.fromEntries(selected.map(profile => [profile.account.id, profile.amounts[row.month]])) }))
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3">{accountControl}<label className="flex items-center gap-2 text-sm">账户类型<select aria-label="账户对比类型" value={type} className="h-9 rounded-md border border-input bg-background px-3 text-sm" onChange={event => { setType(event.target.value as AccountComparisonType); setSelection(null) }}><option value="all">全部类型</option><option value="bank_card">仅储蓄卡</option><option value="credit_card">仅信用卡</option></select></label></div><span className="text-xs text-muted-foreground">已展示 {selected.length} / 共 {profiles.length} 个有支出账户 · {currency}</span></div>
    {selected.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="month" tickFormatter={value => String(value).slice(5)}/><YAxis width={56} tickFormatter={value => value >= 10000 ? `${(value / 10000).toFixed(1)}万` : `${Math.round(value)}`}/><Tooltip labelFormatter={label => `${label}${label === currentMonth ? '（未结束）' : ''}`} formatter={((value: number, name: string) => [format(value), name]) as never}/>{selected.map(profile => <Line key={profile.account.id} dataKey={row => row.values[profile.account.id] || 0} name={profile.account.name} stroke={accountLineColor(profile.account.id)} type="monotone" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }}/>)}</LineChart></ResponsiveContainer></div> : <p className="py-10 text-center text-sm text-muted-foreground">{profiles.length ? '请勾选要比较的账户。' : '此类型在近 12 个月没有可统计的支出。'}</p>}
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{profiles.map(profile => <label key={profile.account.id} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs"><input type="checkbox" aria-label={`比较${profile.account.name}`} checked={ids.includes(profile.account.id)} onChange={event => setSelection({ key, ids: event.target.checked ? [...ids, profile.account.id] : ids.filter(id => id !== profile.account.id) })}/><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accountLineColor(profile.account.id) }}/><span className="min-w-0 flex-1 truncate" title={profile.account.name}>{profile.account.name}</span><span className="shrink-0 font-mono text-expense">{format(profile.total)}</span></label>)}</div>
    {profiles.length > 5 && <p className="text-xs text-muted-foreground">默认展示支出最高的 5 个账户，可勾选其他账户加入。</p>}
  </div>
}
