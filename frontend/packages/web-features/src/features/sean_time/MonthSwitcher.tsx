import { Button, Input } from '@beecount/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  value: string
  max: string
  onChange: (month: string) => void
}

function shiftMonth(value: string, offset: number): string {
  const [year, month] = value.split('-').map(Number)
  const next = new Date(year, month - 1 + offset, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

export function MonthSwitcher({ value, max, onChange }: Props) {
  return <div className="flex items-center overflow-hidden rounded-md border border-input bg-background">
    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-none border-r" aria-label="上一个月" onClick={() => onChange(shiftMonth(value, -1))}>
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <Input
      type="month"
      value={value}
      max={max}
      aria-label="选择月份"
      onChange={(event) => { if (event.target.value) onChange(event.target.value) }}
      className="h-9 w-36 rounded-none border-0 text-center shadow-none focus-visible:ring-0"
    />
    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-none border-l" aria-label="下一个月" disabled={value >= max} onClick={() => onChange(shiftMonth(value, 1))}>
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
}
