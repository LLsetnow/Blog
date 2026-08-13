/**
 * Fetch the GitHub contribution calendar and save locally.
 *
 * Usage:  GITHUB_TOKEN=<token> node tools/fetch-contributions.mjs
 * Output: public/contributions/contributions.json
 *
 * Contributions are only exposed through the GraphQL API — the REST API has no
 * equivalent — so this needs a token. Fault-tolerant: keeps existing data on
 * any failure so a token hiccup can't blank the widget.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT_DIR, 'public/contributions')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'contributions.json')

const LOGIN = 'LLsetnow'

/** Weeks of history to show. 26 keeps the grid legible at the widget's width. */
const WEEKS = 26

const QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount }
        }
      }
    }
  }
}`

/**
 * Window covering the last WEEKS weeks, starting on a Sunday so the grid's
 * first column is full and days line up with GitHub's Sunday-first calendar.
 */
function range() {
  const to = new Date()
  // Built in UTC throughout: converting a local midnight with toISOString()
  // shifts the boundary a day earlier east of Greenwich, which drags a stray
  // Saturday into the first column.
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
  from.setUTCDate(from.getUTCDate() - WEEKS * 7 + 1)
  from.setUTCDate(from.getUTCDate() - from.getUTCDay()) // back up to Sunday
  return { from: from.toISOString(), to: to.toISOString() }
}

// ---------- helpers ----------

function keepExisting(reason) {
  if (fs.existsSync(OUTPUT_FILE)) {
    console.log(`contributions unavailable (${reason}), keeping existing data`)
    return
  }
  console.log(`contributions unavailable (${reason}), writing empty placeholder`)
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ user: LOGIN, updatedAt: null, total: 0, days: [], stats: null }, null, 2),
  )
}

/**
 * Map raw counts onto GitHub's five intensity levels.
 *
 * Thresholds come from the quartiles of the *active* days rather than fixed
 * numbers, so the scale adapts to how busy the year actually was instead of
 * flattening to one shade on a quiet account.
 */
function toLevels(days) {
  const active = days.filter(d => d.count > 0).map(d => d.count).sort((a, b) => a - b)
  if (active.length === 0) return days.map(d => ({ ...d, level: 0 }))

  const q = p => active[Math.min(active.length - 1, Math.floor(active.length * p))]
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)]

  return days.map(d => {
    let level = 0
    if (d.count > 0) level = d.count <= q1 ? 1 : d.count <= q2 ? 2 : d.count <= q3 ? 3 : 4
    return { ...d, level }
  })
}

/** Longest and current runs of consecutive days with at least one contribution. */
function streaks(days) {
  let longest = 0
  let run = 0
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0
    if (run > longest) longest = run
  }

  // Walk backwards for the current streak. Today counts as "not broken yet"
  // when it is still empty — the day isn't over.
  let current = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++
    else if (i !== days.length - 1) break
  }

  return { longest, current }
}

// ---------- main ----------

async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) return keepExisting('GITHUB_TOKEN not set')

  let payload
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'fetch-contributions-script',
      },
      body: JSON.stringify({ query: QUERY, variables: { login: LOGIN, ...range() } }),
    })
    if (!res.ok) return keepExisting(`HTTP ${res.status}`)
    payload = await res.json()
  } catch (e) {
    return keepExisting(e.message)
  }

  if (payload.errors?.length) return keepExisting(payload.errors[0].message)

  const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar
  if (!calendar) return keepExisting('unexpected response shape')

  const days = calendar.weeks
    .flatMap(w => w.contributionDays)
    .map(d => ({ date: d.date, count: d.contributionCount }))

  if (days.length === 0) return keepExisting('no days returned')

  const withLevels = toLevels(days)
  const busiest = days.reduce((a, b) => (b.count > a.count ? b : a), days[0])

  const output = {
    user: LOGIN,
    updatedAt: new Date().toISOString(),
    weeks: WEEKS,
    total: calendar.totalContributions,
    days: withLevels,
    stats: {
      ...streaks(days),
      activeDays: days.filter(d => d.count > 0).length,
      busiest,
    },
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

  console.log(
    `✓ ${OUTPUT_FILE}\n  ${output.total} contributions across ${days.length} days, ` +
      `longest streak ${output.stats.longest}d, busiest ${busiest.date} (${busiest.count})`,
  )
}

main().catch(e => {
  console.error(e)
  keepExisting('unhandled error')
})
