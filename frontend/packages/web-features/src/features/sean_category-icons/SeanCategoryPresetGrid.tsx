import { useEffect, useState } from 'react'
import { Button, useT } from '@beecount/ui'
import { filterCategoryIconPresets, type CategoryIconPreset, type PresetGroup } from './catalog'
import { categoryPresetPalette, presetPreviewSource, type PresetPalette } from './presetColors'

function PresetImage({ preset, palette }: { preset: CategoryIconPreset; palette?: PresetPalette }) {
  const [preview, setPreview] = useState<{ key: string; src: string } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const key = `${preset.id}:${palette?.outline || 'original'}:${palette?.fill || ''}:${palette?.badgeKind || ''}`
  useEffect(() => {
    let active = true
    presetPreviewSource(preset, palette).then(src => {
      if (active) { setFailed(null); setPreview({ key, src }) }
    }).catch(() => { if (active) setFailed(key) })
    return () => { active = false }
  }, [key, preset])
  if (failed === key) return <span className="h-[42px] w-[42px] text-muted-foreground">—</span>
  if (preview?.key !== key) return <span className="h-[42px] w-[42px]" aria-hidden />
  return <img alt="" src={preview.src} width={42} height={42} className="h-[42px] w-[42px] object-contain" />
}

export function SeanCategoryPresetGrid({ query, kind, disabled, onSelect }: {
  query: string
  kind: string
  disabled: boolean
  onSelect: (preset: CategoryIconPreset, palette?: PresetPalette) => Promise<void>
}) {
  const t = useT()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [group, setGroup] = useState<PresetGroup>('all')
  const palette = categoryPresetPalette(kind)
  const presets = filterCategoryIconPresets(query, group)
  return <div className="space-y-3">
    {palette ? <p className={kind === 'income' ? 'text-income text-xs' : 'text-expense text-xs'}>{t(kind === 'income' ? 'categories.presets.income' : 'categories.presets.expense')} · {kind === 'income' ? '＋' : '－'}</p> : null}
    <div className="flex flex-wrap gap-2">
      {(['all', 'ecommerce', 'supermarket', 'convenience'] as const).map(item => <Button key={item} size="sm" type="button"
        variant={group === item ? 'default' : 'outline'} disabled={disabled || pendingId !== null}
        aria-pressed={group === item} onClick={() => setGroup(item)}>
        {t(`categories.presets.group.${item}`)} · {filterCategoryIconPresets('', item).length}
      </Button>)}
    </div>
    <p className="text-xs text-muted-foreground">{t('categories.presets.hint')}</p>
    <p className="text-xs text-muted-foreground">{t('categories.presets.styleHint')}</p>
    {error ? <p role="alert" className="text-sm text-destructive">{t('categories.presets.error')}</p> : null}
    {!presets.length ? <p className="py-8 text-center text-xs text-muted-foreground">{t('categories.iconPicker.empty')}</p> : null}
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {presets.map(preset => <button key={preset.id} type="button" disabled={disabled || pendingId !== null}
        aria-label={preset.label} title={preset.keywords.join('、')}
        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border/40 bg-card p-2 transition-colors hover:border-primary/50 hover:bg-accent/40 disabled:opacity-50"
        onClick={async () => {
          if (pendingId !== null) return
          setPendingId(preset.id)
          setError(false)
          try { await onSelect(preset, palette) } catch { setError(true) } finally { setPendingId(null) }
        }}>
        <PresetImage preset={preset} palette={palette} />
        <span className="w-full truncate text-center text-xs">{pendingId === preset.id ? t('categories.presets.preparing') : preset.label}</span>
      </button>)}
    </div>
  </div>
}
