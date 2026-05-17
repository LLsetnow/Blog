/**
 * Fetch AI daily news via opc CLI and save as JSON.
 *
 * Usage:  node tools/fetch-news.mjs
 * Output: public/news/today.json
 *
 * Uses `opc news --json` for direct structured JSON output (no markdown parsing).
 * Called from npm prebuild with `|| true` pattern — always exits 0.
 * opc is installed via `pip install -e opc-src/` in CI (LLsetnow/OPC repo).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '../public/news')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'today.json')

// ---------- helpers ----------

/**
 * Get current time formatted as ISO 8601 with Asia/Shanghai offset (+08:00).
 */
function getISO8601Shanghai() {
  const now = new Date()
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return shanghai.toISOString().replace('Z', '+08:00')
}

/**
 * Try to locate the opc CLI binary.
 */
function findOpc() {
  const candidates = [
    'opc',
    path.join(process.env.HOME || '/root', '.local/bin/opc'),
    path.join(process.env.HOME || '/root', 'qwen3-tts-venv/bin/opc'),
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
 * Run `opc news --json` and return parsed data object.
 * opc prints JSON to stdout in --json mode.
 */
function runOpcJson() {
  const opcCmd = findOpc()
  if (!opcCmd) {
    throw new Error('opc CLI not found in PATH, ~/.local/bin, or venv')
  }

  const result = execSync(`"${opcCmd}" news --json`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 300_000, // 5 minutes
    env: { ...process.env },
  })

  const stdout = (result || '').trim()
  if (!stdout) {
    throw new Error('opc news --json produced no output')
  }

  // The JSON output might be mixed with print() output from the Python script.
  // Find the JSON object by locating the first `{` and last `}`.
  const jsonStart = stdout.indexOf('{')
  const jsonEnd = stdout.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('No JSON object found in opc output')
  }

  const jsonStr = stdout.slice(jsonStart, jsonEnd + 1)
  return JSON.parse(jsonStr)
}

// ---------- fallback ----------

function handleFallback(reason) {
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
      if (existing && existing.sections && existing.sections.length > 0) {
        console.warn(`opc/news unavailable (${reason}), keeping existing data`)
        return
      }
    } catch {
      // file corrupted, proceed to placeholder
    }
  }

  console.warn(`opc/news unavailable (${reason}), creating placeholder`)
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

  // 1. Run opc news --json and get structured data
  let data
  try {
    data = runOpcJson()
    console.log('✓ opc news --json captured')
  } catch (e) {
    console.warn('opc command failed:', e.message)
    handleFallback('opc unavailable')
    return
  }

  // 2. Attach generation timestamp
  data.updatedAt = getISO8601Shanghai()

  // 3. Atomic write
  const tmpFile = OUTPUT_FILE + '.tmp'
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2) + '\n')
  // Validate before rename
  JSON.parse(fs.readFileSync(tmpFile, 'utf-8'))
  fs.renameSync(tmpFile, OUTPUT_FILE)

  const itemCount = data.sections.reduce((sum, s) => sum + s.items.length, 0)
  console.log(`✓ ${OUTPUT_FILE} (${data.sections.length} sections, ${itemCount} items)`)
}

main()
