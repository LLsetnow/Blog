import sharp from 'sharp'
import { mkdir, readdir, copyFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const live2dDir = join(__dirname, '..', 'public', 'live2d-models', 'Hiyori')
const srcDir = join(live2dDir, 'Hiyori.2048')
const outDir = join(live2dDir, 'Hiyori.1024')

const TARGET_SIZE = 1024

async function main() {
  await mkdir(outDir, { recursive: true })

  const files = await readdir(srcDir)
  const pngs = files.filter(f => extname(f).toLowerCase() === '.png')

  await Promise.all(pngs.map(async (file) => {
    const inputPath = join(srcDir, file)
    const outputPath = join(outDir, file)

    const meta = await sharp(inputPath).metadata()
    const scale = Math.min(TARGET_SIZE / meta.width, TARGET_SIZE / meta.height)

    if (scale >= 1) {
      // Already smaller than target, just copy
      await copyFile(inputPath, outputPath)
      console.log(`  ${file}: ${meta.width}x${meta.height} → copy (already <= ${TARGET_SIZE}px)`)
    } else {
      const newW = Math.round(meta.width * scale)
      const newH = Math.round(meta.height * scale)
      await sharp(inputPath).resize(newW, newH).png().toFile(outputPath)
      const { size: outSize } = await sharp(outputPath).metadata()
      console.log(`  ${file}: ${meta.width}x${meta.height} → ${newW}x${newH} (est. ${((outSize ?? 0) / 1024).toFixed(0)}KB)`)
    }
  }))

  console.log(`\nOptimized ${pngs.length} textures → ${outDir}`)
}

main().catch(err => { console.error(err); process.exit(1) })
