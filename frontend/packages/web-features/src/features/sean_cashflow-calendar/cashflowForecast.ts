import type { WorkspaceAccount, WorkspaceTransaction } from '@beecount/api-client'

export type CashflowForecastEvent = {
  id: string
  date: string
  title: string
  amount: number
  kind: 'income' | 'expense' | 'credit-card'
  source: 'history' | 'credit-card'
  detail: string
}

export type CashflowForecast = {
  events: CashflowForecastEvent[]
  openingBalance: number
  projectedBalance: number
  lowestBalance: number
  lowestBalanceDate: string | null
  expectedIncome: number
  expectedExpense: number
  ignoredCurrencies: string[]
}

const LIQUID_TYPES = new Set(['cash', 'bank_card', 'alipay', 'wechat'])

function localDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function accountType(account: WorkspaceAccount): string {
  if (account.account_type) return account.account_type
  const name = `${account.name} ${account.bank_name || ''}`
  if (/信用卡/i.test(name)) return 'credit_card'
  if (/储蓄卡|借记卡/i.test(name)) return 'bank_card'
  if (/支付宝|余额宝/i.test(name)) return 'alipay'
  if (/微信|零钱通/i.test(name)) return 'wechat'
  if (/现金|钱包/i.test(name)) return 'cash'
  return ''
}

function balanceOf(account: WorkspaceAccount): number {
  return typeof account.balance === 'number' ? account.balance : account.initial_balance ?? 0
}

function amountOf(tx: WorkspaceTransaction): number {
  return Math.abs(Number(tx.native_amount ?? tx.amount) || 0)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function monthIndex(value: string): number {
  const [year, month] = value.slice(0, 7).split('-').map(Number)
  return year * 12 + month
}

function nextMonthlyDates(day: number, start: Date, days: number): Date[] {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days + 1)
  const dates: Date[] = []
  for (let offset = 0; offset <= 2; offset += 1) {
    const year = start.getFullYear()
    const month = start.getMonth() + offset
    const lastDay = new Date(year, month + 1, 0).getDate()
    const date = new Date(year, month, Math.min(day, lastDay))
    if (date > start && date < end) dates.push(date)
  }
  return dates
}

export function buildCashflowForecast(
  transactions: WorkspaceTransaction[],
  accounts: WorkspaceAccount[],
  currency: string,
  days: 30 | 60,
  now = new Date(),
): CashflowForecast {
  const base = currency.toUpperCase()
  const ignoredCurrencies = new Set<string>()
  const groups = new Map<string, WorkspaceTransaction[]>()

  for (const tx of transactions) {
    if (tx.tx_type === 'transfer' || tx.exclude_from_stats) continue
    const txCurrency = (tx.currency_code || base).toUpperCase()
    if (txCurrency !== base) { ignoredCurrencies.add(txCurrency); continue }
    const title = (tx.note || tx.category_name || '').trim()
    if (!title) continue
    const key = `${tx.tx_type}:${title.toLocaleLowerCase()}`
    groups.set(key, [...(groups.get(key) || []), tx])
  }

  const events: CashflowForecastEvent[] = []
  for (const [key, rows] of groups) {
    const monthly = new Map<string, WorkspaceTransaction>()
    for (const row of rows.sort((a, b) => a.happened_at.localeCompare(b.happened_at))) {
      monthly.set(row.happened_at.slice(0, 7), row)
    }
    const samples = [...monthly.values()].filter((row) => new Date(row.happened_at) <= now).slice(-6)
    if (samples.length < 3) continue
    const sampleMonths = samples.map((row) => monthIndex(row.happened_at))
    const currentMonth = now.getFullYear() * 12 + now.getMonth() + 1
    if (currentMonth - sampleMonths[sampleMonths.length - 1] > 2) continue
    if (sampleMonths.slice(1).some((value, index) => value - sampleMonths[index] > 2)) continue
    const amounts = samples.map(amountOf).filter((value) => value > 0)
    const typical = median(amounts)
    if (!typical || Math.max(...amounts) / Math.min(...amounts) > 1.25) continue
    const day = Math.round(median(samples.map((row) => new Date(row.happened_at).getDate())))
    const latestSample = samples[samples.length - 1]
    const title = (latestSample.note || latestSample.category_name || '周期交易').trim()
    for (const date of nextMonthlyDates(day, now, days)) {
      const kind = samples[0].tx_type === 'income' ? 'income' : 'expense'
      events.push({
        id: `history:${key}:${localDate(date)}`,
        date: localDate(date), title, amount: typical, kind, source: 'history',
        detail: `根据最近 ${samples.length} 个月的稳定记录推测`,
      })
    }
  }

  for (const account of accounts) {
    const accountCurrency = (account.currency || base).toUpperCase()
    if (accountCurrency !== base) { ignoredCurrencies.add(accountCurrency); continue }
    if (accountType(account) !== 'credit_card' || !account.payment_due_day) continue
    const owed = Math.max(0, -balanceOf(account))
    if (!owed) continue
    const date = nextMonthlyDates(account.payment_due_day, now, days)[0]
    if (!date) continue
    events.push({
      id: `credit-card:${account.id}:${localDate(date)}`,
      date: localDate(date), title: `${account.name}还款`, amount: owed,
      kind: 'credit-card', source: 'credit-card', detail: `按账户还款日 ${account.payment_due_day} 日和当前欠款计算`,
    })
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
  const openingBalance = accounts.reduce((sum, account) => {
    const sameCurrency = (account.currency || base).toUpperCase() === base
    return sameCurrency && LIQUID_TYPES.has(accountType(account)) ? sum + balanceOf(account) : sum
  }, 0)
  let running = openingBalance
  let lowestBalance = openingBalance
  let lowestBalanceDate: string | null = null
  let expectedIncome = 0
  let expectedExpense = 0
  for (const event of events) {
    if (event.kind === 'income') { running += event.amount; expectedIncome += event.amount }
    else { running -= event.amount; expectedExpense += event.amount }
    if (running < lowestBalance) { lowestBalance = running; lowestBalanceDate = event.date }
  }
  return {
    events, openingBalance, projectedBalance: running, lowestBalance, lowestBalanceDate,
    expectedIncome, expectedExpense, ignoredCurrencies: [...ignoredCurrencies].sort(),
  }
}
