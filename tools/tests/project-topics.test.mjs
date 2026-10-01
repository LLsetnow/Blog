import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const fetchScript = path.join(repoRoot, 'tools/fetch-projects.mjs')

const configuredRepos = [
  ['opc', 'OPC'],
  ['video-make', 'VideoMake'],
  ['examinai', 'examinai'],
  ['agent-bot', 'AgentBot'],
  ['mio-chat', 'MioChat'],
  ['graph-rag', 'GraphRag'],
  ['personal-blog', 'Blog'],
  ['hdu-baidu', 'HDU_19_Baidu'],
  ['todolist-web', 'TodoListWeb'],
]

const fetchPreload = `
import fs from 'node:fs'

globalThis.fetch = async (input) => {
  const url = new URL(typeof input === 'string' ? input : input.url)
  fs.appendFileSync(process.env.TOPICS_FETCH_LOG_PATH, url.href + '\\n')
  if (url.hostname !== 'api.github.com' || !/^\\/repos\\/[^/]+\\/[^/]+$/.test(url.pathname)) {
    throw new Error('unexpected fetch during topics-only mode')
  }

  const repo = url.pathname.split('/').at(-1).toLowerCase().replace(/\\.git$/, '')
  const overrides = JSON.parse(process.env.TOPICS_FETCH_OVERRIDES || '{}')
  const override = overrides[repo]
  if (override?.kind === 'network') throw new Error('mock network failure')
  if (override?.kind === 'http') return new Response('unavailable', { status: override.status || 503 })
  if (override?.kind === 'invalid-json') return new Response('{', { status: 200 })

  const body = override?.kind === 'missing-topics'
    ? { name: repo }
    : override?.kind === 'custom'
      ? override.body
      : { name: repo, topics: override?.topics ?? ['new-topic', 'typescript'] }
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}
`

function projectInput() {
  const managed = configuredRepos.map(([id, repo]) => ({
    id,
    name: `Display ${id}`,
    description: `Existing description for ${id}`,
    tech: ['Old Topic'],
    url: `https://github.com/LLsetnow/${repo}`,
    website: `https://${id}.example.test`,
    websiteLabel: `Visit ${id}`,
    readme: `# ${id}\n\n![keep](local-image.png)`,
    nestedUnknownField: { keep: [id, 1, { value: true }] },
  }))

  return [
    ...managed,
    {
      id: 'unmanaged-project',
      name: 'Unknown project',
      description: 'Must remain untouched',
      tech: ['Manual tag'],
      customField: { keep: true },
    },
  ]
}

function makeTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-project-topics-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

function runTopicsOnly({ dir, inputPath, outputPath, overrides = {} }) {
  const preloadPath = path.join(dir, 'mock-fetch.mjs')
  const logPath = path.join(dir, 'fetch.log')
  fs.writeFileSync(preloadPath, fetchPreload)
  fs.writeFileSync(logPath, '')

  const result = spawnSync(process.execPath, [
    '--import', preloadPath,
    fetchScript,
    '--topics-only',
    '--input-json', inputPath,
    '--output-json', outputPath,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      TOPICS_FETCH_LOG_PATH: logPath,
      TOPICS_FETCH_OVERRIDES: JSON.stringify(overrides),
      GITHUB_TOKEN: '',
    },
  })

  return { result, requests: fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean) }
}

test('topics-only maps GitHub topics, treats an empty topic list as authoritative, and only changes managed tech', (t) => {
  const dir = makeTempDir(t)
  const inputPath = path.join(dir, 'live-projects.json')
  const outputPath = path.join(dir, 'candidate.json')
  const input = projectInput()
  writeJson(inputPath, input)
  const inputBytes = fs.readFileSync(inputPath)
  const { result, requests } = runTopicsOnly({
    dir,
    inputPath,
    outputPath,
    overrides: {
      opc: { topics: ['new-topic', 'ai'] },
      videomake: { topics: [] },
    },
  })

  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.deepEqual(JSON.parse(fs.readFileSync(outputPath, 'utf8')), input.map((project) => {
    if (project.id === 'opc') return { ...project, tech: ['New Topic', 'AI'] }
    if (project.id === 'video-make') return { ...project, tech: [] }
    if (configuredRepos.some(([id]) => id === project.id)) return { ...project, tech: ['New Topic', 'TypeScript'] }
    return project
  }))
  assert.deepEqual(fs.readFileSync(inputPath), inputBytes, 'the input file must not be modified')
  assert.equal(requests.length, configuredRepos.length, 'one repository info request is expected per configured project')
  assert(requests.every((request) => request.startsWith('https://api.github.com/repos/')))
  assert(requests.every((request) => !request.includes('/readme') && !request.startsWith('https://raw.githubusercontent.com/')))
})

for (const [label, override] of [
  ['missing topics field', { kind: 'missing-topics' }],
  ['malformed topics field', { kind: 'custom', body: { topics: 'not-an-array' } }],
  ['malformed API JSON', { kind: 'invalid-json' }],
  ['GitHub API HTTP failure', { kind: 'http', status: 503 }],
  ['GitHub API network failure', { kind: 'network' }],
]) {
  test(`topics-only leaves both files untouched on ${label}`, (t) => {
    const dir = makeTempDir(t)
    const inputPath = path.join(dir, 'live-projects.json')
    const outputPath = path.join(dir, 'candidate.json')
    writeJson(inputPath, projectInput())
    const inputBefore = fs.readFileSync(inputPath)
    const outputBefore = Buffer.from('existing candidate must survive')
    fs.writeFileSync(outputPath, outputBefore)

    const { result } = runTopicsOnly({
      dir,
      inputPath,
      outputPath,
      overrides: { opc: override },
    })

    assert.notEqual(result.status, 0, result.stdout || 'invalid Topics response unexpectedly succeeded')
    assert.deepEqual(fs.readFileSync(inputPath), inputBefore)
    assert.deepEqual(fs.readFileSync(outputPath), outputBefore, 'a failure must not partially replace the candidate')
    assert.match(result.stderr, /repo=opc/)
    assert.doesNotMatch(result.stderr, /mock network failure|unavailable/)
  })
}
