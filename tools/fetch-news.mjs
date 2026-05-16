/**
 * Fetch AI daily news via opc CLI and save as JSON.
 *
 * Usage:  node tools/fetch-news.mjs
 * Output: public/news/today.json
 *
 * Called from npm prebuild with `|| true` pattern — always exits 0.
 * opc is installed via `pip install -e opc-src/` in CI (LLsetnow/OPC repo).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '../public/news')
const TMP_DIR = path.resolve(OUTPUT_DIR, '.tmp-news')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'today.json')

// ---------- helpers ----------

/**
 * Get current time formatted as ISO 8601 with Asia/Shanghai offset (+08:00).
 * Uses UTC-based arithmetic so it works regardless of the system timezone.
 */
function getISO8601Shanghai() {
  const now = new Date()
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return shanghai.toISOString().replace('Z', '+08:00')
}

/**
 * Try to locate the opc CLI binary.
 * Returns the command path string or null if not found.
 */
function findOpc() {
  const candidates = [
    'opc',                                                      // system PATH
    path.join(process.env.HOME || '/root', '.local/bin/opc'),   // pipx / user install
    path.join(process.env.HOME || '/root', 'qwen3-tts-venv/bin/opc'), // project venv
  ]

  for (const cmd of candidates) {
    try {
      execSync(`"${cmd}" --help`, { stdio: 'pipe', timeout: 5000 })
      return cmd
    } catch {
      // try next candidate
    }
  }

  return null
}

/**
 * Run `opc news -o <tmpdir>` and capture its stdout as markdown.
 * If stdout is empty, searches tmpdir for .md output files.
 *
 * @returns {string} Markdown content from opc news
 * @throws {Error} if opc is not found or the command fails
 */
function runOpc() {
  const opcCmd = findOpc()
  if (!opcCmd) {
    throw new Error('opc CLI not found in PATH, ~/.local/bin, or venv')
  }

  fs.mkdirSync(TMP_DIR, { recursive: true })

  try {
    const result = execSync(`"${opcCmd}" news -o "${TMP_DIR}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 240_000, // 4 minutes
      env: { ...process.env },
    })

    let md = (result || '').trim()

    // If stdout is empty, try to find a markdown file in the output directory
    if (!md) {
      try {
        const files = fs.readdirSync(TMP_DIR)
        const mdFile = files.find((f) => f.endsWith('.md'))
        if (mdFile) {
          md = fs.readFileSync(path.join(TMP_DIR, mdFile), 'utf-8')
          console.warn(`opc wrote to file instead of stdout: ${mdFile}`)
        }
      } catch {
        // tmpdir may have been cleaned or empty
      }
    }

    if (!md) {
      throw new Error('opc news produced no output (stdout and tmpdir both empty)')
    }

    return md
  } finally {
    // Cleanup tmpdir regardless of success/failure
    try {
      fs.rmSync(TMP_DIR, { recursive: true, force: true })
    } catch {
      // best-effort cleanup
    }
  }
}

// ---------- markdown parsing ----------

/**
 * Parse news items from a section body.
 *
 * Each item follows the pattern:
 *   N. EMOJI **TITLE**
 *   DESCRIPTION TEXT (may span multiple lines)
 *   [link text](url)
 *
 * @param {string} body - Section body text (everything after the `## Name` header)
 * @returns {Array<{id: number, title: string, description: string, url: string, stars: number|null}>}
 */
function parseItems(body) {
  const items = []

  // Split on newline followed by number + dot + space (item boundary)
  const parts = body.split(/\r?\n(?=\d+\. )/)

  for (const part of parts) {
    const text = part.trim()
    if (!text) continue

    const lines = text.split(/\r?\n/)
    const firstLine = lines[0].trim()

    // Match: "N. EMOJI **TITLE (optional ⭐N)**"
    // Uses /u flag and \S+ to handle emoji with variation selectors (e.g. 🗂️ = U+1F5C2 + U+FE0F)
    const titleMatch = firstLine.match(/^\d+\.\s+(\S+)\s+\*\*(.+?)\*\*/u)
    if (!titleMatch) continue

    let title = titleMatch[2].trim()

    // Extract star count "(⭐N)" from title text
    let stars = null
    const starMatch = title.match(/\(⭐(\d+)\)/u)
    if (starMatch) {
      stars = parseInt(starMatch[1], 10)
      title = title.replace(/\s*\(⭐\d+\)\s*/, ' ').trim()
    }

    // Extract URL from the last markdown link line
    // URL line format: [text](url) — the link text may differ from the displayed URL
    let url = ''
    let descEnd = lines.length
    for (let i = lines.length - 1; i >= 1; i--) {
      const lineText = lines[i].trim()
      const urlMatch = lineText.match(/^\[([^\]]*)\]\(([^)]+)\)$/)
      if (urlMatch) {
        url = urlMatch[2]
        descEnd = i
        break
      }
    }

    // Description: all non-empty lines between title line and URL line
    const description = lines
      .slice(1, descEnd)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join('\n')

    items.push({
      id: items.length + 1,
      title,
      description: description || '',
      url: url || '',
      stars,
    })
  }

  return items
}

/**
 * Parse the full opc news markdown into structured JSON.
 *
 * Expected format:
 *   # AI日报 | YYYY-MM-DD
 *
 *   ## Section Name
 *   ---
 *   1. EMOJI **Title**
 *   Description
 *   [url](url)
 *
 * @param {string} md - Raw markdown from opc news
 * @returns {{ date: string, sections: Array<{name: string, items: Array}> }}
 */
function parseMarkdown(md) {
  if (!md || !md.trim()) {
    throw new Error('Empty markdown input')
  }

  // Extract date from "# AI日报 | YYYY-MM-DD"
  const dateMatch = md.match(/^# .*?\| (\d{4}-\d{2}-\d{2})/m)
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]

  // Split by ## headers — discard content before the first ##
  const sectionBlocks = md.split(/^## /m).slice(1)

  const sections = []
  for (const block of sectionBlocks) {
    const lines = block.split(/\r?\n/)
    const name = lines[0].trim()
    if (!name) continue

    // Build body: everything after section name, stripping blank lines and optional `---` separator
    let bodyStart = 1
    while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++
    if (bodyStart < lines.length && lines[bodyStart].trim() === '---') bodyStart++
    while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++
    const body = lines.slice(bodyStart).join('\n')

    const items = parseItems(body)
    sections.push({ name, items })
  }

  return { date, sections }
}

// ---------- fallback ----------

/**
 * Handle the case where news data is unavailable.
 * If today.json already exists, preserve it. Otherwise create a minimal placeholder.
 *
 * @param {string} reason - Human-readable reason for the fallback
 */
function handleFallback(reason) {
  if (fs.existsSync(OUTPUT_FILE)) {
    console.warn(`opc/news unavailable (${reason}), keeping existing ${OUTPUT_FILE}`)
    return
  }

  console.warn(`opc/news unavailable (${reason}), creating placeholder ${OUTPUT_FILE}`)
  const placeholder = {
    date: new Date().toISOString().split('T')[0],
    updatedAt: getISO8601Shanghai(),
    sections: [],
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const tmpFile = OUTPUT_FILE + '.tmp'
  fs.writeFileSync(tmpFile, JSON.stringify(placeholder, null, 2) + '\n')
  fs.renameSync(tmpFile, OUTPUT_FILE)
}

// ---------- main ----------

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // 1. Run opc news and capture markdown
  let md
  try {
    md = runOpc()
    console.log('✓ opc news output captured')
  } catch (e) {
    console.warn('opc command failed:', e.message)
    handleFallback('opc unavailable')
    return
  }

  // 2. Parse markdown into structured JSON
  let data
  try {
    data = parseMarkdown(md)
  } catch (e) {
    console.error('Markdown parsing failed:', e.message)
    handleFallback('parse error')
    return
  }

  // 3. Attach generation timestamp (Asia/Shanghai timezone)
  data.updatedAt = getISO8601Shanghai()

  // 4. Atomic write: write to .tmp then rename (avoids readers seeing partial file)
  const tmpFile = OUTPUT_FILE + '.tmp'
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2) + '\n')
  fs.renameSync(tmpFile, OUTPUT_FILE)

  const itemCount = data.sections.reduce((sum, s) => sum + s.items.length, 0)
  console.log(`✓ ${OUTPUT_FILE} (${data.sections.length} sections, ${itemCount} items)`)
}

main()
