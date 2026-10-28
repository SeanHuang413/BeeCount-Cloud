// Optional design QA/export helper. Requires sharp (available in the desktop
// workspace runtime); it is not a production dependency. SVGs stay editable.
const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('sharp')
const root = path.resolve(__dirname, '../..')
const source = path.join(root, 'frontend/packages/web-features/src/features/sean_category-icons/assets/pastel-vector-v2')
const output = path.join(root, 'output/category-icons/pastel-vector-v2')
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')

async function main() {
  const { icons } = JSON.parse(await fs.readFile(path.join(output, 'manifest.json'), 'utf8'))
  await fs.mkdir(path.join(output, 'png'), { recursive: true })
  const layers = []
  for (const [index, { id, label }] of icons.entries()) {
    const svg = await fs.readFile(path.join(source, `${id}.svg`))
    const png = await sharp(svg).png().toBuffer()
    const meta = await sharp(png).metadata()
    if (meta.width !== 512 || meta.height !== 512 || !meta.hasAlpha) throw new Error(`Invalid export: ${id}`)
    const corner = await sharp(png).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer()
    if (corner[3] !== 0) throw new Error(`Opaque background: ${id}`)
    await fs.writeFile(path.join(output, 'png', `${id}.png`), png)
    const x = (index % 10) * 160
    const y = Math.floor(index / 10) * 205 + 100
    for (const [size, dx, dy] of [[88, 36, 10], [42, 33, 145], [32, 93, 150]]) {
      layers.push({ input: await sharp(svg).resize(size, size).png().toBuffer(), left: x + dx, top: y + dy })
    }
    layers.push({ input: Buffer.from(`<svg width="160" height="205"><text x="80" y="120" text-anchor="middle" font-family="Microsoft YaHei,sans-serif" font-size="13" fill="#40566F">${escape(label)}</text><text x="80" y="137" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#758296">${escape(id)}</text></svg>`), left: x, top: y })
  }
  layers.push({ input: Buffer.from('<svg width="1600" height="90"><text x="32" y="40" font-size="26" font-family="Microsoft YaHei,sans-serif" fill="#40566F">柔彩分类图标 · ' + icons.length + ' 项</text><text x="32" y="70" font-size="15" font-family="Microsoft YaHei,sans-serif" fill="#758296">矢量重绘 / 透明 PNG / 每项下方为 42px 和 32px 实际尺寸</text></svg>'), left: 0, top: 0 })
  await sharp({ create: { width: 1600, height: 100 + Math.ceil(icons.length / 10) * 205, channels: 4, background: '#ffffff' } }).composite(layers).png().toFile(path.join(output, 'overview.png'))
  const additions = process.argv.includes('--additions')
  const columns = additions ? 3 : 4
  const samples = additions ? ['feige-wedding', 'wedding-banquet', 'merchant-pinduoduo', 'balance-adjustment', 'home-living', 'shoes', 'everyday-clothes', 'handbag', 'other-reimbursement'] : ['food', 'shopping', 'car', 'medical', 'fuel', 'parking', 'repair', 'membership']
  const sampleLayers = []
  for (const [index, id] of samples.entries()) {
    const x = (index % columns) * 220
    const y = Math.floor(index / columns) * 210
    sampleLayers.push({ input: await sharp(path.join(source, `${id}.svg`)).resize(128, 128).png().toBuffer(), left: x + 46, top: y + 24 })
    const { label } = icons.find(icon => icon.id === id)
    sampleLayers.push({ input: Buffer.from(`<svg width="220" height="210"><text x="110" y="181" text-anchor="middle" font-family="Microsoft YaHei,sans-serif" font-size="16" fill="#40566F">${escape(label)}</text></svg>`), left: x, top: y })
  }
  await sharp({ create: { width: columns * 220, height: Math.ceil(samples.length / columns) * 210, channels: 4, background: '#ffffff' } }).composite(sampleLayers).png().toFile(path.join(output, additions ? 'additions.png' : 'sample.png'))
  console.log(`Verified and exported ${icons.length} transparent 512px PNGs; wrote overview.png`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
