/**
 * Fetch GitHub project data (info, README, images) and save locally.
 *
 * Usage:  node tools/fetch-projects.mjs
 * Output: public/projects-data/projects.json + images in public/projects-data/images/
 *
 * The generated JSON is loaded by Projects.vue and ProjectPost.vue
 * instead of calling the GitHub API at runtime.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '../public/projects-data')
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images')
const API_TIMEOUT_MS = 30_000


/**
 * Card tags come from each repo's GitHub topics — edit them on GitHub, not here.
 * `fallbackTech` is a full-refresh fallback for unavailable or empty topic data.
 * Topics-only mode requires valid topic data and treats an empty list as a clear.
 */
const repos = [
  { id: 'opc',            name: 'OPC',          fallbackTech: ['Python', 'CLI', 'AIGC', 'TTS', 'ASR', 'ComfyUI'], url: 'https://github.com/LLsetnow/OPC' },
  { id: 'video-make',     name: 'VideoMake',    fallbackTech: ['AIGC', 'Video', 'Python'],                       url: 'https://github.com/LLsetnow/VideoMake', videoUrl: 'https://space.bilibili.com/39493006/upload/video' },
  {
    id: 'examinai',
    name: 'Examinai',
    fallbackTech: ['Next.js', 'React', 'TypeScript', 'AI', 'IELTS'],
    url: 'https://github.com/LLsetnow/examinai',
    website: 'https://ielts.akai.ink',
    websiteLabel: '体验雅思批改',
  },
  { id: 'agent-bot',      name: 'AgentBot',     fallbackTech: ['Agent', 'ComfyUI', 'AIGC', 'Python'],           url: 'https://github.com/LLsetnow/AgentBot' },
  { id: 'mio-chat',       name: 'MioChat',      fallbackTech: ['Python', 'LLM', 'ASR', 'TTS'],                   url: 'https://github.com/LLsetnow/MioChat.git', website: 'https://chat.akai.ink', websiteLabel: '在线体验' },
  { id: 'graph-rag',      name: 'GraphRag',     fallbackTech: ['RAG', 'GraphRAG', 'LLM', 'Python'],             url: 'https://github.com/LLsetnow/GraphRag.git' },
  { id: 'personal-blog',  name: '个人博客',       fallbackTech: ['Vue 3', 'TypeScript', 'SCSS'],                  url: 'https://github.com/LLsetnow/Blog' },
  { id: 'hdu-baidu',      name: 'HDU_19_Baidu', fallbackTech: ['C++', '机器视觉', '目标检测'],                     url: 'https://github.com/LLsetnow/HDU_19_Baidu.git' },
  { id: 'todolist-web',   name: 'TodoListWeb',  fallbackTech: ['全栈', 'MongoDB', 'Vue 3', 'Express'],         url: 'https://github.com/LLsetnow/TodoListWeb.git' },
]

/**
 * GitHub topics are lowercase ASCII with hyphens, which reads poorly on a card.
 * Map the ones whose display form can't be derived; everything else falls back
 * to title-casing the hyphen-separated words (`machine-learning` → Machine Learning).
 */
const TOPIC_LABELS = {
  ai: 'AI',
  aigc: 'AIGC',
  asr: 'ASR',
  cli: 'CLI',
  comfyui: 'ComfyUI',
  cpp: 'C++',
  'computer-vision': '机器视觉',
  fullstack: '全栈',
  graphrag: 'GraphRAG',
  ielts: 'IELTS',
  javascript: 'JavaScript',
  llm: 'LLM',
  mongodb: 'MongoDB',
  nextjs: 'Next.js',
  'object-detection': '目标检测',
  rag: 'RAG',
  scss: 'SCSS',
  tts: 'TTS',
  typescript: 'TypeScript',
  vue3: 'Vue 3',
}

// ---------- helpers ----------

function parseGitHubUrl(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git|\/|$)/)
  if (!m) return null
  return { owner: m[1], repoName: m[2].replace(/\.git$/, '') }
}

function authHeaders() {
  const token = process.env.GITHUB_TOKEN
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function apiJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'fetch-projects-script', ...authHeaders() },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  })
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status} ${res.statusText}`)
    error.name = 'HttpStatusError'
    throw error
  }
  try {
    return await res.json()
  } catch {
    const error = new Error('Invalid JSON response')
    error.name = 'InvalidResponseError'
    throw error
  }
}

function formatTopic(topic) {
  if (Object.hasOwn(TOPIC_LABELS, topic)) return TOPIC_LABELS[topic]
  return topic
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function decodeBase64Utf8(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

async function downloadFile(url, destPath) {
  const res = await fetch(url, { signal: AbortSignal.timeout(API_TIMEOUT_MS) })
  if (!res.ok) return false
  const buf = await res.arrayBuffer()
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, Buffer.from(buf))
  return true
}

/** A sanitized failure raised by the Topics-only refresh. */
class TopicSyncError extends Error {
  /** @param {string} repoId @param {string} phase @param {string} category */
  constructor(repoId, phase, category) {
    super(`topics_sync_failed repo=${repoId} phase=${phase} category=${category}`)
    this.name = 'TopicSyncError'
  }
}

/** Create a Topics error that contains only safe diagnostic fields. */
function topicFailure(repoId, phase, category) {
  return new TopicSyncError(repoId, phase, category)
}

/** Map request failures to a safe diagnostic category. */
function topicErrorCategory(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout'
  if (error?.name === 'HttpStatusError') return 'http'
  if (error?.name === 'InvalidResponseError') return 'invalid_response'
  return 'network'
}

/** Parse the optional Topics-only paths from process arguments. */
function parseTopicArguments(args) {
  if (args.length === 0) return null
  if (args[0] !== '--topics-only') throw topicFailure('all', 'input', 'input')

  const options = new Map()
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!['--input-json', '--output-json'].includes(flag) || !value || options.has(flag)) {
      throw topicFailure('all', 'input', 'input')
    }
    options.set(flag, value)
  }

  const inputPath = options.get('--input-json')
  const outputPath = options.get('--output-json')
  if (!inputPath || !outputPath || path.resolve(inputPath) === path.resolve(outputPath)) {
    throw topicFailure('all', 'input', 'input')
  }
  return { inputPath: path.resolve(inputPath), outputPath: path.resolve(outputPath) }
}

/** Validate the input list and index projects by their unique IDs. */
function topicProjectIndex(projects) {
  if (!Array.isArray(projects)) throw topicFailure('all', 'input', 'input')
  const index = new Map()
  for (const project of projects) {
    if (!project || typeof project !== 'object' || Array.isArray(project)
      || typeof project.id !== 'string' || !project.id.trim() || index.has(project.id)) {
      throw topicFailure('all', 'input', 'input')
    }
    index.set(project.id, project)
  }

  for (const repo of repos) {
    const project = index.get(repo.id)
    if (!project || !Array.isArray(project.tech) || !project.tech.every((label) => typeof label === 'string')) {
      throw topicFailure(repo.id, 'input', 'input')
    }
  }
  return index
}

/** Write JSON through a sibling file while preserving the requested mode. */
function writeJsonAtomically(outputPath, value, mode) {
  const directory = path.dirname(outputPath)
  const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`
  try {
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), { flag: 'wx', mode })
    fs.chmodSync(temporaryPath, mode)
    fs.renameSync(temporaryPath, outputPath)
  } finally {
    fs.rmSync(temporaryPath, { force: true })
  }
}

/** Refresh only configured repository topics into a separate candidate file. */
async function runTopicsOnly({ inputPath, outputPath }) {
  let projects
  let inputMode
  try {
    projects = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
    inputMode = fs.statSync(inputPath).mode & 0o777
  } catch {
    throw topicFailure('all', 'input', 'input')
  }
  const projectsById = topicProjectIndex(projects)

  for (const repo of repos) {
    const parsed = parseGitHubUrl(repo.url)
    if (!parsed) throw topicFailure(repo.id, 'repo-info', 'input')

    let info
    try {
      info = await apiJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repoName}`)
    } catch (error) {
      throw topicFailure(repo.id, 'repo-info', topicErrorCategory(error))
    }
    if (!info || typeof info !== 'object' || Array.isArray(info)
      || !Array.isArray(info.topics)
      || !info.topics.every((topic) => typeof topic === 'string' && topic.trim().length > 0)) {
      throw topicFailure(repo.id, 'repo-info', 'invalid_response')
    }

    // An empty GitHub topics list is authoritative and clears the card labels.
    projectsById.get(repo.id).tech = info.topics.map(formatTopic)
  }

  try {
    writeJsonAtomically(outputPath, projects, inputMode)
  } catch {
    throw topicFailure('all', 'output', 'io')
  }
  console.log(`topics_sync_candidate_ready repositories=${repos.length}`)
}

/**
 * Compress a downloaded image and generate WebP variant.
 * Returns the new file size for logging.
 */
async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return

  const webpPath = filePath.replace(ext, '.webp')
  const tmpPath = filePath + '.tmp'
  const pipeline = sharp(filePath).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })

  try {
    await Promise.all([
      // Compress original format in-place
      ext === '.png'
        ? pipeline.clone().png({ quality: 80 }).toFile(tmpPath)
        : pipeline.clone().jpeg({ quality: 80 }).toFile(tmpPath),
      // WebP variant
      pipeline.clone().webp({ quality: 75 }).toFile(webpPath),
    ])
  } catch (e) {
    // Don't leave a half-written .tmp behind — CI commits this directory
    fs.rmSync(tmpPath, { force: true })
    throw e
  }

  // Replace original with compressed version
  fs.renameSync(tmpPath, filePath)

  const { size: origSize } = fs.statSync(filePath)
  const { size: webpSize } = fs.statSync(webpPath)
  return { origKB: (origSize / 1024).toFixed(0), webpKB: (webpSize / 1024).toFixed(0) }
}

/**
 * Rewrite relative image URLs in markdown / HTML to local paths,
 * and collect download tasks.
 */
function collectAndRewriteImages(content, owner, repoName, projectId) {
  const base = `https://raw.githubusercontent.com/${owner}/${repoName}/main`
  const tasks = []
  let idx = 0

  // Markdown images: ![alt](url)
  content = content.replace(
    /(!\[[^\]]*\]\()([^)]+)(\))/g,
    (match, prefix, url, suffix) => {
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return match
      const clean = url.startsWith('/') ? url.slice(1) : url
      const fullUrl = `${base}/${clean}`
      const ext = path.extname(clean) || '.img'
      const name = `img-${idx}${ext}`
      idx++
      tasks.push({ url: fullUrl, projectId, name })
      return `${prefix}/projects-data/images/${projectId}/${name}${suffix}`
    },
  )

  // HTML <img src="url">
  content = content.replace(
    /(<img[^>]*src\s*=\s*["'])([^"']+)(["'][^>]*>)/g,
    (match, prefix, url, suffix) => {
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return match
      const clean = url.startsWith('/') ? url.slice(1) : url
      const fullUrl = `${base}/${clean}`
      const ext = path.extname(clean) || '.img'
      const name = `img-${idx}${ext}`
      idx++
      tasks.push({ url: fullUrl, projectId, name })
      return `${prefix}/projects-data/images/${projectId}/${name}${suffix}`
    },
  )

  // Also rewrite absolute raw.githubusercontent.com URLs that point to the same repo
  const repoRaw = `raw.githubusercontent.com/${owner}/${repoName}`
  content = content.replace(
    new RegExp(`https?://${repoRaw}/[^/]+/([^"')]+)`, 'g'),
    (match, filePath) => {
      const ext = path.extname(filePath) || '.img'
      const name = `img-${idx}${ext}`
      idx++
      tasks.push({ url: match, projectId, name })
      return `/projects-data/images/${projectId}/${name}`
    },
  )

  return { content, tasks }
}

// ---------- main ----------

async function main() {
  const topicsOnlyOptions = parseTopicArguments(process.argv.slice(2))
  if (topicsOnlyOptions) return runTopicsOnly(topicsOnlyOptions)

  console.log('Fetching project data from GitHub …\n')

  const projects = []
  let totalImages = 0

  for (const repo of repos) {
    process.stdout.write(`  ${repo.id} … `)
    const parsed = parseGitHubUrl(repo.url)
    if (!parsed) { console.log('✗ invalid URL'); continue }
    const { owner, repoName } = parsed

    try {
      // 1. repo info (name + description + topics)
      const info = await apiJson(`https://api.github.com/repos/${owner}/${repoName}`)

      // Topics are the source of truth for card tags; fall back if the repo has none
      const topics = info.topics ?? []
      const tech = topics.length ? topics.map(formatTopic) : repo.fallbackTech

      // 2. README
      let readme = ''
      try {
        const readmeData = await apiJson(`https://api.github.com/repos/${owner}/${repoName}/readme`)
        readme = decodeBase64Utf8(readmeData.content)
      } catch {
        // fallback to raw
        const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/main/README.md`, {
          signal: AbortSignal.timeout(API_TIMEOUT_MS),
        })
        if (raw.ok) readme = await raw.text()
      }

      // 3. rewrite image references + collect downloads
      const { content, tasks } = collectAndRewriteImages(readme, owner, repoName, repo.id)
      totalImages += tasks.length

      projects.push({
        id: repo.id,
        name: info.name,
        description: info.description ?? '',
        tech,
        url: repo.url,
        website: repo.website ?? null,
        websiteLabel: repo.websiteLabel ?? null,
        videoUrl: repo.videoUrl ?? null,
        readme: content,
        _images: tasks, // meta field, stripped before writing JSON
      })

      console.log(`✓ ${info.name}  [${tech.join(', ')}]${topics.length ? '' : ' (fallback tags)'}`)
    } catch (e) {
      console.log(`✗ ${e.message}`)
      projects.push({
        id: repo.id,
        name: repo.name,
        description: '',
        tech: repo.fallbackTech,
        url: repo.url,
        website: repo.website ?? null,
        websiteLabel: repo.websiteLabel ?? null,
        videoUrl: repo.videoUrl ?? null,
        readme: `# ${repo.name}\n\n_Project data temporarily unavailable._`,
        _images: [],
      })
    }
  }

  // Write projects.json (strip internal _images field)
  const output = projects.map(({ _images, ...rest }) => rest)
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUTPUT_DIR, 'projects.json'), JSON.stringify(output, null, 2))
  console.log(`\n✓ ${OUTPUT_DIR}/projects.json`)

  // Download images
  if (totalImages > 0) {
    console.log(`\nDownloading ${totalImages} image(s) …`)
    let ok = 0
    for (const p of projects) {
      for (const img of p._images || []) {
        const dest = path.join(IMAGES_DIR, img.projectId, img.name)
        const success = await downloadFile(img.url, dest)
        if (success) ok++
        process.stdout.write(success ? '✓' : '✗')
      }
    }
    console.log(`\n  ${ok}/${totalImages} downloaded`)

    // Optimize images (compress + WebP)
    console.log(`\nOptimizing images …`)
    let optOk = 0
    let totalSavings = 0
    for (const p of projects) {
      for (const img of p._images || []) {
        const filePath = path.join(IMAGES_DIR, img.projectId, img.name)
        if (!fs.existsSync(filePath)) continue
        try {
          const sizes = await optimizeImage(filePath)
          if (sizes) {
            process.stdout.write(`  ${img.projectId}/${img.name}: ${sizes.origKB}KB + ${sizes.webpKB}KB (webp)\n`)
            optOk++
          }
        } catch { process.stdout.write('✗') }
      }
    }
    console.log(`  ${optOk} images optimized`)
  }

  console.log('\nDone.')
}

main().catch((error) => {
  if (error instanceof TopicSyncError) console.error(error.message)
  else console.error(error)
  process.exitCode = 1
})
