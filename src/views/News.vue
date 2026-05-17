<template>
  <AppLayout>
    <div class="news">
      <div class="news__header">
        <div class="news__header-titles">
          <h1 class="news__title">新闻</h1>
          <span v-if="data?.date" class="news__date">{{ formatDate(data.date) }}</span>
        </div>
        <span v-if="data?.updatedAt" class="news__updated">{{ formatDateTime(data.updatedAt) }}</span>
      </div>

      <!-- Tag filter -->
      <div v-if="data && !loading && !error" class="news__tags">
        <button
          v-for="tag in allTags"
          :key="tag"
          class="news__tag"
          :class="{ 'news__tag--active': selectedTag === tag }"
          @click="selectedTag = tag"
        >
          {{ tag }}
        </button>
      </div>

      <div v-if="loading" class="news__loading">
        <p>正在加载新闻...</p>
      </div>

      <div v-else-if="error" class="news__error">
        <p>无法加载新闻数据</p>
        <p class="news__error-detail">{{ error }}</p>
      </div>

      <div v-else-if="!data" class="news__empty">
        <p>暂无新闻数据</p>
      </div>

      <div v-else-if="filteredItems.length === 0" class="news__empty">
        <p>没有匹配的新闻</p>
      </div>

      <div v-else class="news__grid">
        <a
          v-for="item in filteredItems"
          :key="item.id"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="news__card glass-card"
        >
          <h3 class="news__card-title">
            {{ item.title }}
            <span v-if="item.stars !== null" class="news__card-stars">
              <svg class="news__card-star-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {{ item.stars }}
            </span>
          </h3>
          <p class="news__card-description">{{ item.description }}</p>
          <span class="news__card-category">{{ item.sectionName }}</span>
        </a>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { NewsData, NewsItem } from '@/types'
import AppLayout from '@/components/layout/AppLayout.vue'

interface NewsItemWithSection extends NewsItem {
  sectionName: string
}

const loading = ref<boolean>(true)
const error = ref<string | null>(null)
const data = ref<NewsData | null>(null)
const selectedTag = ref<string>('全部')

const allTags = computed(() => {
  if (!data.value) return ['全部']
  return ['全部', ...data.value.sections.map(s => s.name)]
})

const allItems = computed<NewsItemWithSection[]>(() => {
  if (!data.value) return []
  const result: NewsItemWithSection[] = []
  for (const section of data.value.sections) {
    for (const item of section.items) {
      result.push({ ...item, sectionName: section.name })
    }
  }
  return result
})

const filteredItems = computed(() => {
  if (selectedTag.value === '全部') return allItems.value
  return allItems.value.filter(item => item.sectionName === selectedTag.value)
})

const baseUrl = import.meta.env.BASE_URL || '/'

onMounted(async () => {
  try {
    const res = await fetch(`${baseUrl}news/today.json?t=${Date.now()}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `更新于 ${formatDate(dateStr)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.news {
  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: $spacing-sm;
    margin-bottom: $spacing-xl;
  }

  &__header-titles {
    display: flex;
    align-items: baseline;
    gap: $spacing-md;
    flex-wrap: wrap;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    color: $text-primary;
  }

  &__date {
    font-size: $font-size-base;
    color: $text-muted;
  }

  &__updated {
    font-size: $font-size-sm;
    color: $text-muted;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    margin-bottom: $spacing-xl;
  }

  &__tag {
    padding: 6px 16px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: $text-secondary;
    font-size: $font-size-sm;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.4);
      color: $text-primary;
    }

    &--active {
      background: $accent-primary;
      color: #fff;
      border-color: $accent-primary;

      &:hover {
        background: $accent-primary;
        color: #fff;
        opacity: 0.9;
      }
    }
  }

  &__loading,
  &__error,
  &__empty {
    text-align: center;
    padding: $spacing-3xl;
    color: $text-muted;
  }

  &__error-detail {
    font-size: $font-size-sm;
    margin-top: $spacing-sm;
    color: $text-muted;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: $spacing-lg;
  }

  &__card {
    @include glass-card;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    &:hover {
      transform: translateY(-4px);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.8),
        inset 0 0 14px 4px rgba(255, 255, 255, 0.2),
        0 12px 40px rgba(0, 0, 0, 0.12);
    }
  }

  &__card-title {
    font-size: 22px;
    font-weight: 600;
    color: $text-primary;
    line-height: 1.4;
    margin: 0;
  }

  &__card-stars {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: #e6b422;
    font-size: $font-size-sm;
    font-weight: 500;
    margin-left: 6px;
    white-space: nowrap;
  }

  &__card-star-icon {
    flex-shrink: 0;
  }

  &__card-description {
    color: $text-secondary;
    font-size: $font-size-lg;
    line-height: 1.6;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__card-category {
    margin-top: auto;
    align-self: flex-start;
    padding: 2px 8px;
    border-radius: $radius-sm;
    background: rgba($accent-primary, 0.25);
    color: #4a8ba8;
    font-weight: 500;
    font-size: $font-size-sm;
  }
}

@media (max-width: $breakpoint-md) {
  .news {
    &__header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__grid {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: $breakpoint-sm) {
  .news {
    &__grid {
      grid-template-columns: 1fr;
    }

    &__tag {
      padding: 4px 12px;
      font-size: $font-size-xs;
    }
  }
}
</style>
