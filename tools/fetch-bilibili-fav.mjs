/**
 * Fetch Bilibili favorite folder video list and save locally.
 *
 * Usage:  node tools/fetch-bilibili-fav.mjs
 * Output: public/bilibili-fav/favorites.json
 *
 * Requires cookies.txt in Netscape format in the project root.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT_DIR, 'public/bilibili-fav')
const COOKIE_PATH = path.join(ROOT_DIR, 'cookies.txt')

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const REFERER = 'https://www.bilibili.com/'

// ---------- cookie parser ----------

function parseNetscapeCookies(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8')
  const jar = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    // format: domain flag path secure expires name value
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
    .map(([k, v]) => `${k}=${v}`)
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
  if (!fs.existsSync(COOKIE_PATH)) {
    console.error('✗ cookies.txt not found in project root')
    process.exit(1)
  }

  console.log('Parsing cookies …')
  const cookies = parseNetscapeCookies(COOKIE_PATH)

  const uid = cookies['DedeUserID']
  if (!uid) {
    console.error('✗ DedeUserID cookie not found — session may be expired')
    process.exit(1)
  }
  console.log(`  uid: ${uid}`)

  // Step 1: get favorite folder list
  console.log('\nFetching favorite folders …')
  const folderUrl = 'https://api.bilibili.com/x/v3/fav/folder/created/list-all'
  const folderData = await apiJson(folderUrl, cookies, { type: 2, up_mid: uid })

  if (folderData.code !== 0) {
    console.error(`✗ API error ${folderData.code}: ${folderData.message}`)
    console.error('  Cookie may have expired. Update cookies.txt from browser.')
    process.exit(1)
  }

  const folders = folderData.data?.list ?? []
  if (folders.length === 0) {
    console.log('  No favorite folders found.')
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(path.join(OUTPUT_DIR, 'favorites.json'), JSON.stringify({ folders: [], videos: [] }, null, 2))
    console.log(`\n✓ ${OUTPUT_DIR}/favorites.json (empty)`)
    return
  }

  console.log(`  Found ${folders.length} folder(s):`)
  folders.forEach((f, i) => console.log(`    ${i + 1}. [${f.media_count} videos] ${f.title} (id: ${f.id})`))

  // Use the first (default) folder
  const folder = folders[0]
  console.log(`\nFetching videos from "${folder.title}" …`)

  // Step 2: fetch all videos (rate-limited to ~60 req/min to avoid tripwire)
  const resourceUrl = 'https://api.bilibili.com/x/v3/fav/resource/list'
  const allMedias = []
  const totalPages = Math.ceil(folder.media_count / 20)

  for (let pn = 1; ; pn++) {
    const resourceData = await apiJson(resourceUrl, cookies, {
      media_id: folder.id,
      ps: 20,
      pn,
      platform: 'web',
    })

    if (resourceData.code !== 0) {
      console.error(`✗ API error ${resourceData.code}: ${resourceData.message}`)
      process.exit(1)
    }

    const pageItems = resourceData.data?.medias ?? []
    allMedias.push(...pageItems)
    process.stdout.write(`\r  page ${pn}/${totalPages}  (${allMedias.length} / ${folder.media_count})`)

    if (!resourceData.data?.has_more || pageItems.length === 0) break

    // 1.2s delay between pages to stay under B站 rate limit
    await new Promise((r) => setTimeout(r, 1200))
  }

  const medias = allMedias
  console.log(`\n  Got ${medias.length} video(s)`)
  medias.slice(0, 5).forEach((m, i) => console.log(`    ${i + 1}. [${m.title}] BV${m.bvid} — ${m.upper?.name}`))
  if (medias.length > 5) console.log(`    ... and ${medias.length - 5} more`)

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
  fs.writeFileSync(path.join(OUTPUT_DIR, 'favorites.json'), JSON.stringify(output, null, 2))
  console.log(`\n✓ ${OUTPUT_DIR}/favorites.json`)
  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
