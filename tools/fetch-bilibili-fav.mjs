/**
 * Fetch Bilibili favorite folder video list and save locally.
 *
 * Usage:  node tools/fetch-bilibili-fav.mjs
 * Output: public/bilibili-fav/favorites.json
 *
 * Requires cookies.txt in Netscape format in the project root.
 * Fault-tolerant: keeps existing data on any failure.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT_DIR, 'public/bilibili-fav')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'favorites.json')
const COOKIE_PATH = path.join(ROOT_DIR, 'cookies.txt')

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const REFERER = 'https://www.bilibili.com/'

// ---------- helpers ----------

function keepExisting(reason) {
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
      if (existing && existing.videos && existing.videos.length > 0) {
        console.warn(`⚠ ${reason}，保留现有 ${existing.videos.length} 条收藏数据`)
        return true
      }
    } catch {}
  }
  console.warn(`⚠ ${reason}，无可用缓存`)
  return false
}

function writeEmpty() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ folder: null, videos: [], updated_at: new Date().toISOString() }, null, 2))
  console.log(`✓ ${OUTPUT_FILE} (empty placeholder)`)
}

function parseNetscapeCookies(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8')
  const jar = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const parts = trimmed.split('\t')
    if (parts.length < 7) continue
    const name = parts[5]
    const value = parts[6]
    jar[name] = value
  }
  return jar
}

// ---------- api helpers ----------

async function apiJson(url, cookies, params = {}) {
  const u = new URL(url)
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, String(v))
  }
  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${/[^\x00-\x7F]/.test(v) ? encodeURIComponent(v) : v}`)
    .join('; ')

  const res = await fetch(u.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': REFERER,
      'Cookie': cookieStr,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ---------- main ----------

async function main() {
  // Check cookies
  if (!fs.existsSync(COOKIE_PATH)) {
    if (keepExisting('cookies.txt 未找到')) return
    writeEmpty()
    return
  }

  console.log('Parsing cookies …')
  let cookies
  try {
    cookies = parseNetscapeCookies(COOKIE_PATH)
  } catch (e) {
    if (keepExisting('cookies.txt 解析失败')) return
    writeEmpty()
    return
  }

  const uid = cookies['DedeUserID']
  if (!uid) {
    if (keepExisting('DedeUserID cookie 未找到（session 可能已过期）')) return
    writeEmpty()
    return
  }
  console.log(`  uid: ${uid}`)

  // Step 1: get favorite folder list
  console.log('\nFetching favorite folders …')
  let folderData
  try {
    folderData = await apiJson('https://api.bilibili.com/x/v3/fav/folder/created/list-all', cookies, { type: 2, up_mid: uid })
  } catch (e) {
    if (keepExisting(`获取收藏夹列表失败: ${e.message}`)) return
    writeEmpty()
    return
  }

  if (folderData.code !== 0) {
    if (keepExisting(`B站 API 错误 ${folderData.code}: ${folderData.message}`)) return
    writeEmpty()
    return
  }

  const folders = folderData.data?.list ?? []
  if (folders.length === 0) {
    console.log('  No favorite folders found.')
    writeEmpty()
    return
  }

  console.log(`  Found ${folders.length} folder(s):`)
  folders.forEach((f, i) => console.log(`    ${i + 1}. [${f.media_count} videos] ${f.title} (id: ${f.id})`))

  // Use the first (default) folder
  const folder = folders[0]
  console.log(`\nFetching videos from "${folder.title}" …`)

  // Step 2: fetch all videos (rate-limited)
  const allMedias = []
  const totalPages = Math.ceil(folder.media_count / 20)

  try {
    for (let pn = 1; ; pn++) {
      const resourceData = await apiJson('https://api.bilibili.com/x/v3/fav/resource/list', cookies, {
        media_id: folder.id,
        ps: 20,
        pn,
        platform: 'web',
      })

      if (resourceData.code !== 0) {
        throw new Error(`API error ${resourceData.code}: ${resourceData.message}`)
      }

      const pageItems = resourceData.data?.medias ?? []
      allMedias.push(...pageItems)
      process.stdout.write(`\r  page ${pn}/${totalPages}  (${allMedias.length} / ${folder.media_count})`)

      if (!resourceData.data?.has_more || pageItems.length === 0) break

      await new Promise((r) => setTimeout(r, 1200))
    }
  } catch (e) {
    console.error(`\n✗ 获取视频列表失败: ${e.message}`)
    if (allMedias.length > 0) {
      console.warn(`  已获取 ${allMedias.length} 条，保存部分数据`)
    } else {
      if (keepExisting('无新数据')) return
      writeEmpty()
      return
    }
  }

  const medias = allMedias
  console.log(`\n  Got ${medias.length} video(s)`)
  if (medias.length > 0) {
    medias.slice(0, 5).forEach((m, i) => console.log(`    ${i + 1}. [${m.title}] BV${m.bvid} — ${m.upper?.name}`))
    if (medias.length > 5) console.log(`    ... and ${medias.length - 5} more`)
  }

  // Build output
  const videos = medias.map((m) => ({
    id: String(m.id),
    bvid: m.bvid,
    title: m.title,
    cover: m.cover,
    intro: m.intro?.slice(0, 200) ?? '',
    duration: m.duration,
    page: m.page ?? 1,
    up: {
      mid: m.upper?.mid,
      name: m.upper?.name,
      face: m.upper?.face,
    },
    stat: {
      play: m.cnt_info?.play ?? 0,
      collect: m.cnt_info?.collect ?? 0,
      danmaku: m.cnt_info?.danmaku ?? 0,
    },
    pubtime: m.pubtime,
    fav_time: m.fav_time,
    link: `https://www.bilibili.com/video/${m.bvid}`,
  }))

  const output = {
    folder: {
      id: folder.id,
      title: folder.title,
      media_count: folder.media_count,
      cover: folder.cover,
    },
    videos,
    updated_at: new Date().toISOString(),
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const tmp = OUTPUT_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(output, null, 2))
  // Validate before rename
  JSON.parse(fs.readFileSync(tmp, 'utf-8'))
  fs.renameSync(tmp, OUTPUT_FILE)
  console.log(`\n✓ ${OUTPUT_FILE}  (${videos.length} videos)`)
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  // Last-resort: keep existing data
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
      if (existing && existing.videos && existing.videos.length > 0) {
        console.warn(`⚠ 发生未预期错误，保留现有 ${existing.videos.length} 条收藏数据`)
        process.exit(0)
      }
    } catch {}
  }
  writeEmpty()
  process.exit(0)
})
