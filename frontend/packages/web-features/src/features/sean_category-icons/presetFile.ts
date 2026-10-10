import type { CategoryIconPreset } from './catalog'
import { presetPreviewSource, type PresetPalette } from './presetColors'

/** Store presets as ordinary cloud PNGs so mobile needs no new icon-name registry. */
export async function categoryPresetFile(preset: CategoryIconPreset, palette?: PresetPalette): Promise<File> {
  const src = await presetPreviewSource(preset, palette)
  const response = await fetch(src)
  if (!response.ok) throw new Error('Unable to load category icon preset')
  const source = await response.blob()
  if (!source.size) throw new Error('Category icon preset is empty')
  if (preset.sourceKind === 'png' && !palette) {
    return new File([source], `${preset.id}.png`, { type: 'image/png' })
  }
  const url = URL.createObjectURL(source)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to prepare category icon')
    context.drawImage(image, 0, 0, 512, 512)
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to encode category icon')), 'image/png')
    })
    return new File([png], `${preset.id}.png`, { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
