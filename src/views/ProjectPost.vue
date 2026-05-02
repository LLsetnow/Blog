<template>
  <AppLayout>
    <div class="project-post">
      <div v-if="loading" class="project-post__loading">
        <p>正在加载...</p>
      </div>

      <div v-else-if="error" class="project-post__error">
        <p>{{ error }}</p>
        <router-link to="/projects">返回项目列表</router-link>
      </div>

      <div v-else-if="!projectSource" class="project-post__not-found">
        <h1>项目不存在</h1>
        <router-link to="/projects">返回项目列表</router-link>
      </div>

      <div v-else class="project-post__layout">
        <!-- TOC Sidebar -->
        <aside v-if="tocItems.length > 0" class="project-post__toc">
          <nav>
            <div class="project-post__toc-title">目录</div>
            <a
              v-for="item in tocItems"
              :key="item.id"
              :href="'#' + item.id"
              class="project-post__toc-item"
              :class="'project-post__toc-item--h' + item.level"
              @click.prevent="scrollToHeading(item.id)"
            >
              {{ item.text }}
            </a>
          </nav>
        </aside>

        <!-- Main content -->
        <article class="project-post__content">
          <header class="project-post__header">
            <router-link to="/projects" class="project-post__back">← 返回列表</router-link>
            <h1 class="project-post__title">{{ projectSource?.name ?? '' }}</h1>
            <p v-if="projectSource?.description" class="project-post__description">{{ projectSource.description }}</p>
            <div class="project-post__techs">
              <a :href="projectSource.url" target="_blank" rel="noopener noreferrer" class="project-post__github-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </a>
              <span v-for="tech in projectSource.tech" :key="tech" class="project-post__tech">
                {{ tech }}
              </span>
            </div>
          </header>

          <div class="project-post__body" v-html="renderedContent" />
        </article>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Marked } from 'marked'
import DOMPurify from 'dompurify'
import AppLayout from '@/components/layout/AppLayout.vue'

interface ProjectData {
  id: string
  name: string
  description: string
  tech: string[]
  url: string
  readme: string
}

const route = useRoute()

const allProjects = ref<ProjectData[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const projectSource = computed(() =>
  allProjects.value.find(p => p.id === route.params.id) ?? null
)

interface TocItem {
  id: string
  text: string
  level: number
}

const tocItems = ref<TocItem[]>([])
const renderedContent = ref('')

// Slug function that handles Chinese text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'heading'
}

function parseAndRender(markdown: string) {
  // First pass: extract headings for TOC
  const items: TocItem[] = []
  const slugCount: Record<string, number> = {}

  const lines = markdown.split('\n')
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      let id = slugify(text)
      if (slugCount[id] !== undefined) {
        slugCount[id]++
        id = `${id}-${slugCount[id]}`
      } else {
        slugCount[id] = 0
      }
      items.push({ id, text, level })
    }
  }

  tocItems.value = items

  // Render markdown with custom heading IDs matching the TOC
  const dupCount: Record<string, number> = {}
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading(text: string, level: number) {
        let id = slugify(text)
        if (dupCount[id] !== undefined) {
          dupCount[id]++
          id = `${id}-${dupCount[id]}`
        } else {
          dupCount[id] = 0
        }
        return `<h${level} id="${id}">${text}</h${level}>`
      },
    } as any,
  })

  const raw = marked.parse(markdown) as string
  renderedContent.value = DOMPurify.sanitize(raw)
}

const baseUrl = import.meta.env.BASE_URL || '/'

onMounted(async () => {
  try {
    const res = await fetch(`${baseUrl}projects-data/projects.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    allProjects.value = await res.json()

    const project = projectSource.value
    if (project) {
      if (project.readme) {
        parseAndRender(project.readme)
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '无法加载项目数据'
  } finally {
    loading.value = false
  }
})

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style lang="scss" scoped>
.project-post {
  max-width: 1100px;
  margin: 0 auto;

  &__not-found,
  &__loading,
  &__error {
    text-align: center;
    padding: $spacing-3xl;

    h1 {
      font-size: $font-size-2xl;
      margin-bottom: $spacing-lg;
    }
  }

  &__layout {
    display: flex;
    gap: $spacing-xl;
    align-items: flex-start;
  }

  // == TOC Sidebar ==
  &__toc {
    position: sticky;
    top: 200px;
    flex-shrink: 0;
    width: 200px;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    margin-left: -96px;
  }

  &__toc-title {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-muted;
    margin-bottom: $spacing-md;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__toc-item {
    display: block;
    text-decoration: none;
    color: $text-secondary;
    font-size: $font-size-sm;
    line-height: 1.5;
    padding: 4px 0;
    border-radius: $radius-sm;
    transition: color $transition-fast;

    &:hover {
      color: $accent-primary;
    }

    &--h2 {
      padding-left: $spacing-md;
    }

    &--h3 {
      padding-left: $spacing-xl;
    }
  }

  // == Content ==
  &__content {
    flex: 1;
    min-width: 0;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: $spacing-lg;
    padding: 8px 18px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: $text-secondary;
    font-size: $font-size-sm;
    font-weight: 500;
    text-decoration: none;
    transition: all $transition-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
      color: $text-primary;
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-1px);
    }
  }

  &__header {
    margin-bottom: $spacing-xl;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    margin-bottom: $spacing-md;
  }

  &__description {
    color: $text-secondary;
    font-size: $font-size-base;
    line-height: 1.6;
    margin-bottom: $spacing-md;
  }

  &__techs {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &__tech {
    padding: 6px 14px;
    border-radius: $radius-sm;
    background: rgba($accent-primary, 0.25);
    color: #4a8ba8;
    font-weight: 500;
    font-size: $font-size-base;
  }

  &__body {
    @include glass-card;
    padding-left: $spacing-xl;
    padding-right: $spacing-xl;
    line-height: 1.8;
    font-size: $font-size-base;
    color: $text-secondary;

    :deep(h1),
    :deep(h2),
    :deep(h3) {
      color: $text-primary;
      margin-top: $spacing-xl;
      margin-bottom: $spacing-md;
    }

    :deep(p) {
      margin-bottom: $spacing-md;
    }

    :deep(code) {
      background: rgba(0, 0, 0, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: $font-mono;
      font-size: $font-size-sm;
    }

    :deep(pre) {
      background: rgba(0, 0, 0, 0.05);
      padding: $spacing-md;
      border-radius: $radius-md;
      overflow-x: auto;
      margin-bottom: $spacing-md;

      code {
        background: none;
        padding: 0;
      }
    }

    :deep(blockquote) {
      border-left: 3px solid $accent-primary;
      padding-left: $spacing-md;
      margin: $spacing-md 0;
      color: $text-muted;
    }

    :deep(ul),
    :deep(ol) {
      padding-left: $spacing-xl;
      margin-bottom: $spacing-md;
    }

    :deep(hr) {
      border: none;
      border-top: 1px solid $border-color;
      margin: $spacing-xl 0;
    }

    :deep(a) {
      color: $accent-primary;
    }

    :deep(img) {
      max-width: 100%;
      height: auto;
      border-radius: $radius-md;
      display: block;
      margin: $spacing-md auto;
    }

    :deep(table) {
      width: 100%;
      border-collapse: collapse;
      margin: $spacing-md 0;
      font-size: $font-size-sm;
    }

    :deep(th),
    :deep(td) {
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: $spacing-sm $spacing-md;
      text-align: left;
    }

    :deep(th) {
      background: rgba($accent-primary, 0.1);
      color: $text-primary;
      font-weight: 600;
    }

    :deep(tr:nth-child(even)) {
      background: rgba(0, 0, 0, 0.02);
    }
  }

  &__github-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: $radius-sm;
    background: #24292e;
    color: #fff;
    font-size: $font-size-base;
    font-weight: 500;
    text-decoration: none;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 0.85;
    }
  }
}
</style>
