import { ref } from 'vue'
import { blogPosts as seedPosts } from '@/data/blog-posts'
import type { BlogPost } from '@/types'

const API_PREFIX = '/api/blog'

export class BlogApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'BlogApiError'
  }
}

interface SessionResponse {
  authenticated: boolean
  csrfToken?: string
}

function clonePost(post: BlogPost): BlogPost {
  return {
    ...post,
    tags: [...post.tags],
  }
}

const posts = ref<BlogPost[]>([])
const isPostsLoading = ref(false)
const postsError = ref('')
const isAuthenticated = ref(false)
const isAuthLoading = ref(false)
const csrfToken = ref('')

let postsRequest: Promise<void> | null = null

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers,
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Preserve the status-specific error below for empty/non-JSON responses.
  }

  if (!response.ok) {
    if (response.status === 401) {
      isAuthenticated.value = false
      csrfToken.value = ''
    }

    const message =
      typeof payload === 'object'
      && payload !== null
      && 'error' in payload
      && typeof payload.error === 'string'
        ? payload.error
        : '请求失败，请稍后再试。'
    throw new BlogApiError(message, response.status)
  }

  return payload as T
}

/**
 * Load public Markdown posts from the server. Static seed posts are kept as a
 * read-only fallback so a temporary API outage does not blank the public page.
 */
async function loadPosts(force = false): Promise<void> {
  if (postsRequest && !force) return postsRequest
  if (posts.value.length && !force) return

  postsRequest = (async () => {
    isPostsLoading.value = true
    postsError.value = ''

    try {
      posts.value = (await request<BlogPost[]>('/posts')).map(clonePost)
    } catch (error) {
      posts.value = seedPosts.map(clonePost)
      postsError.value = error instanceof Error ? error.message : '博客服务暂时不可用。'
    } finally {
      isPostsLoading.value = false
      postsRequest = null
    }
  })()

  return postsRequest
}

/**
 * Refresh the server session and obtain a CSRF token for write operations.
 */
async function refreshSession(): Promise<void> {
  isAuthLoading.value = true

  try {
    const session = await request<SessionResponse>('/auth/session')
    isAuthenticated.value = session.authenticated
    csrfToken.value = session.csrfToken ?? ''
  } catch {
    isAuthenticated.value = false
    csrfToken.value = ''
  } finally {
    isAuthLoading.value = false
  }
}

/**
 * Verify the password with the backend and keep only the server-issued cookie.
 */
async function login(password: string): Promise<void> {
  isAuthLoading.value = true

  try {
    const session = await request<SessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    isAuthenticated.value = session.authenticated
    csrfToken.value = session.csrfToken ?? ''
  } finally {
    isAuthLoading.value = false
  }
}

/**
 * End the server session and clear the in-memory CSRF token.
 */
async function logout(): Promise<void> {
  try {
    if (csrfToken.value) {
      await request('/auth/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken.value },
      })
    }
  } finally {
    isAuthenticated.value = false
    csrfToken.value = ''
  }
}

/**
 * Create a Markdown post through the authenticated API.
 */
async function createPost(post: BlogPost): Promise<BlogPost> {
  const saved = await request<BlogPost>('/posts', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken.value },
    body: JSON.stringify(post),
  })
  posts.value = [clonePost(saved), ...posts.value.filter(item => item.id !== saved.id)]
  return saved
}

/**
 * Update a Markdown post through the authenticated API.
 */
async function updatePost(post: BlogPost): Promise<BlogPost> {
  const saved = await request<BlogPost>(`/posts/${encodeURIComponent(post.id)}`, {
    method: 'PUT',
    headers: { 'X-CSRF-Token': csrfToken.value },
    body: JSON.stringify(post),
  })
  posts.value = posts.value.map(item => item.id === saved.id ? clonePost(saved) : item)
  return saved
}

/**
 * Access the shared server-backed blog state used by list, detail, and editor.
 */
export function useBlogPosts() {
  function getPost(id: string): BlogPost | undefined {
    return posts.value.find(post => post.id === id)
  }

  return {
    posts,
    isPostsLoading,
    postsError,
    isAuthenticated,
    isAuthLoading,
    loadPosts,
    refreshSession,
    login,
    logout,
    getPost,
    createPost,
    updatePost,
  }
}
