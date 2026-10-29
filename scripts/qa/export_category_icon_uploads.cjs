// Export upload-ready PNGs from exactly the SVGs used by the Web bundle.
const fs = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')
const sharp = require('sharp')

async function exportCategoryIconUploads(root = path.resolve(__dirname, '../..')) {
  const feature = path.join(root, 'frontend/packages/web-features/src/features/sean_category-icons')
  const source = path.join(feature, 'assets/pastel-vector-v2')
  const output = path.join(root, 'output/category-icons/standalone')
  const ts = require(path.join(root, 'frontend/apps/web/node_modules/typescript'))
  async function loadModule(file, imports = {}) {
    const code = ts.transpileModule(await fs.readFile(path.join(feature, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText
    const api = {}
    new Function('exports', 'require', code)(api, id => {
      if (!(id in imports)) throw new Error(`Unexpected preview dependency: ${id}`)
      return imports[id]
    })
    return api
  }
  const badge = await loadModule('presetBadge.ts')
  const colors = await loadModule('presetColors.ts', { './presetBadge': badge })
  const css = await fs.readFile(path.join(root, 'frontend/apps/web/src/styles.css'), 'utf8')
  const palettes = {}
  for (const kind of ['income', 'expense']) {
    const match = css.match(new RegExp(`--${kind}-rgb:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`))
    const palette = match && colors.presetPalette(match.slice(1).join(' '))
    if (!palette) throw new Error(`Missing default theme palette: ${kind}`)
    palettes[kind] = { ...palette, badgeKind: kind }
  }
  const icons = [
    { id: 'merchant-xiaoxiang', name: '小象超市', file: 'merchant-xiaoxiang' },
    { id: 'merchant-dingdong', name: '叮咚购物', file: 'merchant-dingdong' },
    { id: 'payment', name: '沙井老店', file: 'merchant-shajing' },
  ]
  await fs.mkdir(output, { recursive: true })
  const layers = []
  const originals = []
  const manifest = { source: 'Bundled category SVGs with the shared presetBadge/presetColors renderers', palettes, icons: [] }
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  async function writePng(svg, file) {
    const png = await sharp(Buffer.from(svg)).resize(512, 512).ensureAlpha().png().toBuffer()
    const meta = await sharp(png).metadata()
    const corner = await sharp(png).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer()
    if (meta.width !== 512 || meta.height !== 512 || !meta.hasAlpha || corner[3] !== 0) throw new Error(`Invalid upload PNG: ${file}`)
    await fs.writeFile(path.join(output, `${file}.svg`), svg)
    await fs.writeFile(path.join(output, `${file}.png`), png)
    return png
  }
  for (const [column, icon] of icons.entries()) {
    const svg = await fs.readFile(path.join(source, `${icon.id}.svg`), 'utf8')
    const base = await writePng(svg, icon.file)
    originals.push({ input: await sharp(base).resize(160, 160).png().toBuffer(), left: 64 + column * 256, top: 24 })
    originals.push({ input: Buffer.from(`<svg width="256" height="240"><text x="144" y="218" text-anchor="middle" font-family="Microsoft YaHei,sans-serif" font-size="18" fill="#40566F">${escape(icon.name)}</text></svg>`), left: column * 256, top: 0 })
    const entry = { ...icon, sourceSha256: crypto.createHash('sha256').update(svg).digest('hex'), variants: {} }
    for (const [row, kind] of ['income', 'expense'].entries()) {
      const marked = badge.addPresetKindBadge(svg, palettes[kind])
      const file = `${icon.file}-${kind}`
      const png = await writePng(marked, file)
      entry.variants[kind] = `${file}.png`
      const x = column * 256, y = row * 238
      layers.push({ input: await sharp(png).resize(144, 144).png().toBuffer(), left: 64 + x, top: 22 + y })
      layers.push({ input: Buffer.from(`<svg width="256" height="238"><text x="136" y="202" text-anchor="middle" font-family="Microsoft YaHei,sans-serif" font-size="17" fill="#40566F">${escape(icon.name)} · ${kind === 'income' ? '收入＋' : '支出－'}</text></svg>`), left: x, top: y })
    }
    manifest.icons.push(entry)
  }
  await sharp({ create: { width: 800, height: 476, channels: 4, background: '#ffffff' } }).composite(layers).png().toFile(path.join(output, 'shopping-badges-preview.png'))
  await sharp({ create: { width: 800, height: 248, channels: 4, background: '#ffffff' } }).composite(originals).png().toFile(path.join(output, 'shopping-preview.png'))
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  await fs.writeFile(path.join(output, 'README.md'), '# 精品购物统一图标\n\n小象超市、叮咚购物、沙井老店已接入正式扩展图库；打包和独立上传共用同一组 SVG 与角标、配色渲染器。\n\n每项提供 512×512 透明 PNG：`-income.png` 为收入＋，`-expense.png` 为支出－，颜色读取样式表默认主题并保存为快照。应用内选择则使用当前用户主题。无角标版本作为原图保留。\n\n运行 `node scripts/qa/export_category_icon_uploads.cjs` 可单独重建；完整设计导出工具也会自动生成本目录。需要 sharp 和前端已安装的 TypeScript。`manifest.json` 记录正式来源和对应版本。保存分类后沿用原有同步机制；仅更新图库不自动覆盖用户已有图片。商家图形为自制识别插画。\n')
  console.log('Exported 3 bundled subjects and 6 marked upload PNGs from shared sources')
}

module.exports = { exportCategoryIconUploads }
if (require.main === module) exportCategoryIconUploads().catch(error => { console.error(error); process.exitCode = 1 })
