import sharp from 'sharp'
import { readdir, mkdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const imgDir = join(__dirname, '..', 'public', 'img')
const thumbDir = join(imgDir, 'thumbnails')

const THUMB_WIDTH = 200
const VALID_EXTS = new Set(['.jpg', '.jpeg', '.png'])

async function main() {
  await mkdir(thumbDir, { recursive: true })

  const files = await readdir(imgDir)
  const images = files.filter(f => VALID_EXTS.has(extname(f).toLowerCase()))

  await Promise.all(images.map(async (file) => {
    const baseName = file.replace(/\.[^.]+$/, '')
    const inputPath = join(imgDir, file)

    const basePipeline = sharp(inputPath).resize(THUMB_WIDTH)

    const webpPath = join(thumbDir, `${baseName}.webp`)
    const jpgPath = join(thumbDir, `${baseName}.jpg`)

    await Promise.all([
      basePipeline.clone().webp({ quality: 75 }).toFile(webpPath),
      basePipeline.clone().jpeg({ quality: 70 }).toFile(jpgPath),
    ])

    const [webpStat, jpgStat] = await Promise.all([stat(webpPath), stat(jpgPath)])
    console.log(`  ${file} → thumbnails/${baseName}.webp (${(webpStat.size / 1024).toFixed(1)}KB) + .jpg (${(jpgStat.size / 1024).toFixed(1)}KB)`)
  }))

  console.log(`\nGenerated ${images.length * 2} thumbnails in thumbnails/`)
}

main().catch(err => { console.error(err); process.exit(1) })
