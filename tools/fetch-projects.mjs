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


/**
 * Card tags come from each repo's GitHub topics — edit them on GitHub, not here.
 * `fallbackTech` is only used when the API call fails or the repo has no topics.
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
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return res.json()
}

function formatTopic(topic) {
  if (TOPIC_LABELS[topic]) return TOPIC_LABELS[topic]
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
  const res = await fetch(url)
  if (!res.ok) return false
  const buf = await res.arrayBuffer()
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, Buffer.from(buf))
  return true
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
        const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/main/README.md`)
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

main().catch((e) => { console.error(e); process.exit(1) })
