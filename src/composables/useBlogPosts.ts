import { ref } from 'vue'
import { blogPosts as seedPosts } from '@/data/blog-posts'
import type { BlogPost } from '@/types'

const STORAGE_KEY = 'akai-blog-posts-v1'

function clonePost(post: BlogPost): BlogPost {
  return {
    ...post,
    tags: [...post.tags],
  }
}

function isBlogPost(value: unknown): value is BlogPost {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<BlogPost>
  return typeof candidate.id === 'string'
    && candidate.id.trim().length > 0
    && typeof candidate.title === 'string'
    && typeof candidate.date === 'string'
    && Array.isArray(candidate.tags)
    && candidate.tags.every((tag): tag is string => typeof tag === 'string')
    && typeof candidate.excerpt === 'string'
    && typeof candidate.content === 'string'
}

function readStoredPosts(): BlogPost[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isBlogPost)
      .map((post) => clonePost({
        ...post,
        id: post.id.trim(),
        title: post.title.trim(),
        date: post.date.trim(),
        tags: post.tags.map((tag) => tag.trim()).filter(Boolean),
        excerpt: post.excerpt.trim(),
        content: post.content.trim(),
      }))
  } catch {
    return []
  }
}

function mergePosts(): BlogPost[] {
  const merged = seedPosts.map(clonePost)

  for (const storedPost of readStoredPosts()) {
    const index = merged.findIndex((post) => post.id === storedPost.id)
    if (index === -1) {
      merged.push(storedPost)
    } else {
      merged[index] = storedPost
    }
  }

  return merged
}

const posts = ref<BlogPost[]>(mergePosts())

function persistPosts(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts.value))
}

/**
 * Read and update the browser-backed blog collection used by the local editor.
 */
export function useBlogPosts() {
  function getPost(id: string): BlogPost | undefined {
    return posts.value.find((post) => post.id === id)
  }

  function removePost(id: string): void {
    const index = posts.value.findIndex((post) => post.id === id)
    if (index === -1) return

    posts.value = posts.value.filter((post) => post.id !== id)
    persistPosts()
  }

  function upsertPost(post: BlogPost): BlogPost {
    const nextPost = clonePost(post)
    const index = posts.value.findIndex((item) => item.id === nextPost.id)

    if (index === -1) {
      posts.value = [nextPost, ...posts.value]
    } else {
      const nextPosts = [...posts.value]
      nextPosts[index] = nextPost
      posts.value = nextPosts
    }

    persistPosts()
    return nextPost
  }

  return {
    posts,
    getPost,
    removePost,
    upsertPost,
  }
}
