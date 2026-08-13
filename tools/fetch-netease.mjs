/**
 * Fetch NetEase Cloud Music metadata, cover art and lyrics for the tracklist.
 *
 * Usage:  node tools/fetch-netease.mjs
 * Input:  src/data/music.ts  (the neteaseId of each track)
 * Output: public/music-data/tracks.json
 *
 * Only the *metadata* is fetched here. Playback URLs deliberately are not:
 * NetEase's CDN links carry a timestamp and expire within hours, so they have
 * to be resolved in the browser at play time. Covers and lyrics are stable and
 * safe to bake in.
 *
 * Fault-tolerant: keeps existing data on any failure rather than blanking the
 * player.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SOURCE_FILE = path.join(ROOT_DIR, 'src/data/music.ts')
const OUTPUT_DIR = path.join(ROOT_DIR, 'public/music-data')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'tracks.json')

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Referer: 'https://music.163.com',
}

// ---------- helpers ----------

function keepExisting(reason) {
  if (fs.existsSync(OUTPUT_FILE)) {
    console.log(`netease unavailable (${reason}), keeping existing data`)
    return
  }
  console.log(`netease unavailable (${reason}), writing empty placeholder`)
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ updatedAt: null, tracks: [] }, null, 2))
}

/**
 * Pull the track list straight out of the TS source so there is a single place
 * to edit songs. A tiny parser beats adding a build-time TS loader for what is
 * a flat array of string literals.
 */
function readTracks() {
  const src = fs.readFileSync(SOURCE_FILE, 'utf-8')
  const blocks = src.match(/\{[^{}]*\}/g) ?? []
  return blocks
    .map(block => {
      const field = name => block.match(new RegExp(`${name}:\\s*'([^']*)'`))?.[1] ?? null
      return {
        id: field('id'),
        neteaseId: field('neteaseId'),
        src: field('src'),
        // Carried through so local-only tracks keep a name to display.
        title: field('title'),
        artist: field('artist'),
      }
    })
    .filter(t => t.id)
}

async function api(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Parse an LRC body into timed lines, merging the translation track by
 * timestamp. Lines without a timestamp (credits, blank entries) are dropped.
 */
function parseLrc(lrc, translated) {
  const parse = text => {
    const out = new Map()
    for (const line of (text ?? '').split('\n')) {
      const m = line.match(/^\[(\d+):(\d+)(?:[.:](\d+))?\]\s*(.*)$/)
      if (!m) continue
      const content = m[4].trim()
      if (!content) continue
      const fraction = m[3] ? Number(`0.${m[3]}`) : 0
      out.set(Math.round((Number(m[1]) * 60 + Number(m[2]) + fraction) * 100) / 100, content)
    }
    return out
  }

  const main = parse(lrc)
  const trans = parse(translated)
  return [...main.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, text]) => ({ time, text, trans: trans.get(time) ?? null }))
}

// ---------- main ----------

async function main() {
  let tracks
  try {
    tracks = readTracks()
  } catch (e) {
    return keepExisting(`cannot read ${SOURCE_FILE}: ${e.message}`)
  }
  if (tracks.length === 0) return keepExisting('no tracks found in music.ts')

  console.log(`Fetching NetEase metadata for ${tracks.length} track(s) …\n`)
  const out = []

  for (const track of tracks) {
    // Tracks without an id are local-only by design; keep them as-is.
    if (!track.neteaseId) {
      console.log(`  ${track.id} … local only`)
      out.push({ ...track, album: null, cover: null, duration: null, lyrics: [] })
      continue
    }

    try {
      const detail = await api(
        `https://music.163.com/api/song/detail?ids=%5B${track.neteaseId}%5D`,
      )
      const song = detail.songs?.[0]
      if (!song) throw new Error('song not found')

      const lyric = await api(
        `https://music.163.com/api/song/lyric?id=${track.neteaseId}&lv=1&kv=1&tv=-1`,
      )
      const lyrics = parseLrc(lyric.lrc?.lyric, lyric.tlyric?.lyric)

      out.push({
        ...track,
        title: song.name,
        artist: song.artists.map(a => a.name).join(' / '),
        album: song.album?.name ?? null,
        // Served over https and resized on the fly by NetEase's image CDN.
        cover: song.album?.picUrl?.replace(/^http:/, 'https:') ?? null,
        duration: Math.round((song.duration ?? 0) / 1000),
        lyrics,
      })
      console.log(`  ${track.id} … ✓ ${song.name} (${lyrics.length} lyric lines)`)
    } catch (e) {
      console.log(`  ${track.id} … ✗ ${e.message}, falling back to local file`)
      out.push({ ...track, album: null, cover: null, duration: null, lyrics: [] })
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ updatedAt: new Date().toISOString(), tracks: out }, null, 2),
  )
  console.log(`\n✓ ${OUTPUT_FILE}`)
}

main().catch(e => {
  console.error(e)
  keepExisting('unhandled error')
})
