import { useId, useState } from 'react'
import { CircleHelp } from 'lucide-react'

export function ReportHelp({ label, text }: { label: string; text: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return <span className="group relative inline-flex shrink-0 align-middle" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <button type="button" aria-label={label} aria-describedby={id} aria-expanded={open} onClick={() => setOpen(value => !value)} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur() } }} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <CircleHelp className="h-4 w-4" />
    </button>
    <span id={id} role="tooltip" className={`${open ? 'visible opacity-100' : 'invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'} absolute right-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-3rem))] rounded-lg border bg-popover p-3 text-left text-xs font-normal leading-relaxed text-popover-foreground shadow-lg`}>{text}</span>
  </span>
}
