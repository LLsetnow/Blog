<template>
  <AppLayout>
    <div class="favorites">
      <div class="favorites__header">
        <h1 class="favorites__title">收藏</h1>
        <span v-if="folder" class="favorites__folder-info">
          共 {{ folder.media_count }} 个视频
        </span>
        <span v-if="updatedAt" class="favorites__updated">
          更新于 {{ updatedAt }}
        </span>
      </div>

      <div v-if="!loading && !error && videos.length > 0" class="favorites__search">
        <svg class="favorites__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          class="favorites__search-input"
          placeholder="搜索标题或 UP 主..."
        />
        <button
          v-if="searchQuery"
          class="favorites__search-clear"
          @click="searchQuery = ''"
          title="清除"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div v-if="loading" class="favorites__empty glass-card">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" class="favorites__spinner" />
        </svg>
        <p class="favorites__empty-text">加载中...</p>
      </div>

      <div v-else-if="error" class="favorites__empty glass-card">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <p class="favorites__empty-text">加载失败</p>
        <p class="favorites__empty-hint">{{ error }}</p>
      </div>

      <div v-else-if="videos.length === 0" class="favorites__empty glass-card">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <p class="favorites__empty-text">暂无收藏</p>
        <p class="favorites__empty-hint">请先运行 tools/fetch-bilibili-fav.mjs 获取收藏夹数据</p>
      </div>

      <div v-else>
        <p v-if="searchQuery" class="favorites__result-hint">
          搜索「{{ searchQuery }}」，找到 {{ filteredVideos.length }} 个结果
        </p>
        <div class="favorites__grid">
          <a
            v-for="video in paginatedVideos"
            :key="video.id"
            :href="video.link"
            target="_blank"
            rel="noopener noreferrer"
            class="favorites__card glass-card"
          >
            <div class="favorites__card-cover">
              <img
                :src="httpsCover(video.cover)"
                :alt="video.title"
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="onCoverError"
              />
              <span class="favorites__card-duration">{{ formatDuration(video.duration) }}</span>
            </div>
            <div class="favorites__card-body">
              <h3 class="favorites__card-title">{{ video.title }}</h3>
              <div class="favorites__card-meta">
                <span class="favorites__card-up">
                  <img
                    v-if="video.up.face"
                    :src="httpsCover(video.up.face) + '@48w_48h'"
                    class="favorites__card-up-avatar"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  {{ video.up.name }}
                </span>
                <span class="favorites__card-stat">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 12 12 2 23 12 20 22 4 22" /></svg>
                  {{ formatCount(video.stat.play) }}
                </span>
                <span v-if="video.stat.danmaku > 0" class="favorites__card-stat">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="4" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" /></svg>
                  {{ formatCount(video.stat.danmaku) }}
                </span>
              </div>
            </div>
          </a>
        </div>

        <div v-if="totalPages > 1" class="favorites__pager">
          <button
            class="favorites__pager-btn"
            :disabled="currentPage <= 1"
            @click="currentPage = 1"
            title="首页"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
          <button
            class="favorites__pager-btn"
            :disabled="currentPage <= 1"
            @click="currentPage--"
            title="上一页"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <template v-for="p in visiblePages" :key="p">
            <span v-if="p === -1" class="favorites__pager-ellipsis">...</span>
            <button
              v-else
              class="favorites__pager-btn"
              :class="{ 'favorites__pager-btn--active': p === currentPage }"
              @click="currentPage = p"
            >
              {{ p }}
            </button>
          </template>

          <button
            class="favorites__pager-btn"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
            title="下一页"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            class="favorites__pager-btn"
            :disabled="currentPage >= totalPages"
            @click="currentPage = totalPages"
            title="末页"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
            </svg>
          </button>

          <span class="favorites__pager-info">
            {{ currentPage }} / {{ totalPages }}
          </span>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'

interface BilibiliVideo {
  id: string
  bvid: string
  title: string
  cover: string
  intro: string
  duration: number
  page: number
  up: { mid: number; name: string; face: string }
  stat: { play: number; collect: number; danmaku: number }
  pubtime: number
  fav_time: number
  link: string
}

interface BilibiliFolder {
  id: number
  title: string
  media_count: number
}

interface FavoritesData {
  folder: BilibiliFolder | null
  videos: BilibiliVideo[]
  updated_at: string
}

const baseUrl = import.meta.env.BASE_URL || '/'

const data = ref<FavoritesData | null>(null)
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const PAGE_SIZE = 24

const folder = computed(() => data.value?.folder ?? null)
const videos = computed(() => data.value?.videos ?? [])

const filteredVideos = computed(() => {
  if (!searchQuery.value.trim()) return videos.value
  const q = searchQuery.value.trim().toLowerCase()
  return videos.value.filter(
    (v) =>
      v.title.toLowerCase().includes(q) ||
      v.up.name.toLowerCase().includes(q),
  )
})

const totalPages = computed(() => Math.ceil(filteredVideos.value.length / PAGE_SIZE) || 1)

const paginatedVideos = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredVideos.value.slice(start, start + PAGE_SIZE)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  const pages: number[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }

  pages.push(1)
  if (cur > 3) pages.push(-1)

  const start = Math.max(2, cur - 1)
  const end = Math.min(total - 1, cur + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (cur < total - 2) pages.push(-1)
  pages.push(total)
  return pages
})

watch(searchQuery, () => {
  currentPage.value = 1
})

const updatedAt = computed(() => {
  const t = data.value?.updated_at
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

function httpsCover(url: string): string {
  if (!url) return ''
  return url.replace(/^http:/, 'https:')
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return String(n)
}

function onCoverError(e: Event): void {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

onMounted(async () => {
  try {
    const res = await fetch(`${baseUrl}bilibili-fav/favorites.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.favorites {
  max-width: 960px;
  margin: 0 auto;

  &__header {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    margin: 0;
  }

  &__folder-info {
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__updated {
    font-size: $font-size-xs;
    color: $text-muted;
    margin-left: auto;
  }

  &__search {
    position: relative;
    margin-bottom: $spacing-lg;
  }

  &__search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: $text-muted;
    pointer-events: none;
  }

  &__search-input {
    width: 100%;
    padding: 10px 40px 10px 40px;
    border: none;
    border-radius: $radius-lg;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: $text-primary;
    font-size: $font-size-sm;
    outline: none;
    transition: background 0.2s ease, box-shadow 0.2s ease;

    &::placeholder {
      color: $text-muted;
    }

    &:focus {
      background: rgba(255, 255, 255, 0.25);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
    }
  }

  &__search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.1);
    color: $text-secondary;
    cursor: pointer;
    padding: 0;

    &:hover {
      background: rgba(0, 0, 0, 0.2);
      color: $text-primary;
    }
  }

  &__result-hint {
    font-size: $font-size-xs;
    color: $text-muted;
    margin-bottom: $spacing-md;
    padding-left: 4px;
  }

  &__empty {
    @include glass-card;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-3xl;
    gap: $spacing-md;
    color: $text-muted;
  }

  &__spinner {
    animation: fav-spin 1.5s linear infinite;
  }

  @keyframes fav-spin {
    to { transform: rotate(360deg); }
  }

  &__empty-text {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-secondary;
    margin: 0;
  }

  &__empty-hint {
    font-size: $font-size-sm;
    color: $text-muted;
    margin: 0;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: $spacing-md;
  }

  &__card {
    @include glass-card;
    overflow: hidden;
    padding: 0;
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.6),
        0 16px 40px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(-1px);
    }
  }

  &__card-cover {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.08);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__card-duration {
    position: absolute;
    bottom: 6px;
    right: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    font-variant-numeric: tabular-nums;
  }

  &__card-body {
    padding: $spacing-sm $spacing-md $spacing-md;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    flex: 1;
  }

  &__card-title {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }

  &__card-meta {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    flex-wrap: wrap;
    margin-top: auto;
  }

  &__card-up {
    font-size: $font-size-xs;
    color: $text-secondary;
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 120px;
  }

  &__card-up-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__card-stat {
    font-size: $font-size-xs;
    color: $text-muted;
    display: flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
  }

  &__pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-top: $spacing-xl;
  }

  &__pager-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 6px;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    color: $text-secondary;
    font-size: $font-size-sm;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.25);
      color: $text-primary;
    }

    &:active:not(:disabled) {
      transform: scale(0.95);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    &--active {
      background: $accent-primary;
      color: #fff;
      font-weight: 600;

      &:hover:not(:disabled) {
        background: $accent-primary;
        color: #fff;
      }
    }
  }

  &__pager-ellipsis {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: $text-muted;
    font-size: $font-size-sm;
    user-select: none;
  }

  &__pager-info {
    font-size: $font-size-xs;
    color: $text-muted;
    margin-left: $spacing-sm;
    white-space: nowrap;
  }
}
</style>
