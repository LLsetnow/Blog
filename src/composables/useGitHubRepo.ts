import { ref, onMounted } from 'vue'

const cache = new Map<string, { data: unknown; expiry: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() < entry.expiry) return entry.data as T
  cache.delete(key)
  return null
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

export interface GitHubRepoInfo {
  name: string
  description: string
  html_url: string
  topics: string[]
}

function parseRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git|\/|$)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

export async function fetchRepoInfo(url: string): Promise<GitHubRepoInfo> {
  const parsed = parseRepo(url)
  if (!parsed) throw new Error('Invalid GitHub URL')
  const key = `gh-info-${parsed.owner}/${parsed.repo}`
  const cached = getCached<GitHubRepoInfo>(key)
  if (cached) return cached

  const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`)
  if (!res.ok) throw new Error(`GitHub API: ${res.status}`)
  const data = await res.json()
  const info: GitHubRepoInfo = {
    name: data.name,
    description: data.description ?? '',
    html_url: data.html_url,
    topics: data.topics ?? [],
  }
  setCache(key, info)
  return info
}

function resolveReadmeImages(content: string, owner: string, repo: string): string {
  const base = `https://raw.githubusercontent.com/${owner}/${repo}/main`
  // Rewrite markdown image syntax: ![alt](relative/path)
  let result = content.replace(
    /(!\[[^\]]*\]\()([^)]+)(\))/g,
    (_match, prefix, url, suffix) => {
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return _match
      }
      // Handle absolute repo paths like /path/to/img.png
      const cleanUrl = url.startsWith('/') ? url.slice(1) : url
      return `${prefix}${base}/${cleanUrl}${suffix}`
    }
  )
  // Rewrite HTML <img src="relative/path">
  result = result.replace(
    /(<img[^>]*src\s*=\s*["'])([^"']+)(["'][^>]*>)/g,
    (_match, prefix, url, suffix) => {
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return _match
      }
      const cleanUrl = url.startsWith('/') ? url.slice(1) : url
      return `${prefix}${base}/${cleanUrl}${suffix}`
    }
  )
  return result
}

export async function fetchRepoReadme(url: string): Promise<string> {
  const parsed = parseRepo(url)
  if (!parsed) throw new Error('Invalid GitHub URL')
  const key = `gh-readme-${parsed.owner}/${parsed.repo}`
  const cached = getCached<string>(key)
  if (cached) return cached

  let content: string

  // Try GitHub API first
  const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`)
  if (res.ok) {
    const data = await res.json()
    // Properly decode base64 to UTF-8 (handles Chinese)
    const binary = atob(data.content)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    content = new TextDecoder('utf-8').decode(bytes)
  } else {
    // Fallback to raw
    const rawRes = await fetch(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/README.md`)
    if (rawRes.ok) {
      content = await rawRes.text()
    } else {
      throw new Error('README not found')
    }
  }

  // Resolve relative image URLs to GitHub raw URLs
  content = resolveReadmeImages(content, parsed.owner, parsed.repo)
  setCache(key, content)
  return content
}

export function useGitHubRepo(url: string) {
  const info = ref<GitHubRepoInfo | null>(null)
  const readme = ref('')
  const loading = ref(true)
  const error = ref<string | null>(null)

  onMounted(async () => {
    try {
      const [repoInfo, readmeContent] = await Promise.all([
        fetchRepoInfo(url),
        fetchRepoReadme(url).catch(() => ''),
      ])
      info.value = repoInfo
      readme.value = readmeContent
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch'
    } finally {
      loading.value = false
    }
  })

  return { info, readme, loading, error }
}
