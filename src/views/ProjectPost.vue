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
            <div
              v-for="item in visibleTocItems"
              :key="item.id"
              class="project-post__toc-row"
              :class="'project-post__toc-row--h' + item.level"
            >
              <button
                v-if="item.hasChildren"
                type="button"
                class="project-post__toc-toggle"
                :class="{ 'project-post__toc-toggle--collapsed': collapsedIds.has(item.id) }"
                :aria-expanded="!collapsedIds.has(item.id)"
                :aria-label="(collapsedIds.has(item.id) ? '展开' : '折叠') + '「' + item.text + '」'"
                @click="toggleSection(item.id)"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              <span v-else class="project-post__toc-spacer" />
              <a
                :href="'#' + item.id"
                class="project-post__toc-item"
                @click.prevent="scrollToHeading(item.id)"
              >
                {{ item.text }}
              </a>
            </div>
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
              <a
                v-if="projectSource.website"
                :href="projectSource.website"
                target="_blank"
                rel="noopener noreferrer"
                class="project-post__website-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>
                {{ projectSource.websiteLabel || '在线体验' }}
              </a>
              <span v-for="tech in projectSource.tech" :key="tech" class="project-post__tech">
                {{ tech }}
              </span>
            </div>
          </header>

          <div class="project-post__body" v-html="renderedContent" @click="onContentClick" />
        </article>

        <!-- Image lightbox -->
        <Teleport to="body">
          <Transition name="project-lightbox" @after-leave="afterLightboxLeave">
            <div
              v-if="lightboxOpen"
              class="project-post__lightbox"
              @click="closeLightbox"
              @wheel.prevent="onLightboxWheel"
            >
              <button class="project-post__lightbox-close" @click="closeLightbox" title="关闭">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <div class="project-post__lightbox-frame">
                <img
                  :src="lightboxSrc"
                  :alt="lightboxAlt"
                  class="project-post__lightbox-img"
                  :style="{ transform: `scale(${lightboxScale})` }"
                  @click.stop
                />
              </div>
            </div>
          </Transition>
        </Teleport>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
  website?: string | null
  websiteLabel?: string | null
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

/** Heading levels visible before the reader expands anything (h1 + h2). */
const TOC_DEFAULT_DEPTH = 2

/** IDs of sections whose children are hidden. */
const collapsedIds = ref<Set<string>>(new Set())

/**
 * The TOC stays a flat list — nesting only needs to be known, not rendered — so
 * each entry is annotated with its parent and whether anything nests under it.
 */
const tocTree = computed(() => {
  const ancestors: TocItem[] = []
  return tocItems.value.map((item, i) => {
    while (ancestors.length && ancestors[ancestors.length - 1].level >= item.level) {
      ancestors.pop()
    }
    const parentId = ancestors.length ? ancestors[ancestors.length - 1].id : null
    ancestors.push(item)
    const next = tocItems.value[i + 1]
    return { ...item, parentId, hasChildren: !!next && next.level > item.level }
  })
})

/** An entry shows only when every one of its ancestors is expanded. */
const visibleTocItems = computed(() => {
  const parentOf = new Map(tocTree.value.map(item => [item.id, item.parentId]))
  return tocTree.value.filter(item => {
    for (let id = item.parentId; id; id = parentOf.get(id) ?? null) {
      if (collapsedIds.value.has(id)) return false
    }
    return true
  })
})

function toggleSection(id: string) {
  // Replace rather than mutate so the change is unambiguously reactive.
  const next = new Set(collapsedIds.value)
  if (!next.delete(id)) next.add(id)
  collapsedIds.value = next
}

const renderedContent = ref('')
const lightboxSrc = ref<string | null>(null)
const lightboxAlt = ref('')
const lightboxScale = ref(1)
const lightboxOpen = ref(false)
const MIN_SCALE = 0.5
const MAX_SCALE = 5
const ZOOM_STEP = 0.15

function onContentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName !== 'IMG') return
  lightboxSrc.value = (target as HTMLImageElement).src
  lightboxAlt.value = (target as HTMLImageElement).alt
  lightboxScale.value = 1
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

function afterLightboxLeave() {
  lightboxSrc.value = null
  lightboxAlt.value = ''
  lightboxScale.value = 1
}

function onLightboxWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
  lightboxScale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, lightboxScale.value + delta))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && lightboxOpen.value) {
    closeLightbox()
  }
}

/** Deepest heading level shown in the sidebar TOC. */
const TOC_MAX_LEVEL = 3

/**
 * Flatten a heading's inline HTML back to plain text for the TOC, which renders
 * with `{{ }}` and would otherwise show `<code>` tags literally.
 * `&amp;` is decoded last so `&amp;lt;` doesn't turn into `<`.
 */
function stripInlineHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

// Slug function that handles Chinese text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'heading'
}

function parseAndRender(markdown: string) {
  // The renderer is the single source of truth for both the TOC and the heading
  // IDs it links to. Scanning the raw markdown separately used to pick up `#`
  // comments inside fenced code blocks as headings, and because that extra pass
  // ran its own de-duplication counter, the suffixes it produced drifted out of
  // sync with the ones the renderer assigned to genuinely repeated headings.
  const items: TocItem[] = []
  const dupCount: Record<string, number> = {}

  const marked = new Marked({
    gfm: true,
    renderer: {
      heading(text: string, level: number) {
        // `text` is already inline-rendered HTML, e.g. `预设音色（<code>--x</code>）`
        const plain = stripInlineHtml(text)
        let id = slugify(plain)
        if (dupCount[id] !== undefined) {
          dupCount[id]++
          id = `${id}-${dupCount[id]}`
        } else {
          dupCount[id] = 0
        }
        if (level <= TOC_MAX_LEVEL) items.push({ id, text: plain, level })
        return `<h${level} id="${id}">${text}</h${level}>`
      },
    } as any,
  })

  const raw = marked.parse(markdown) as string
  tocItems.value = items

  // Start with only TOC_DEFAULT_DEPTH levels showing: collapse any entry at or
  // below that depth that actually has something nested under it.
  const collapsed = new Set<string>()
  items.forEach((item, i) => {
    const next = items[i + 1]
    if (next && next.level > item.level && item.level >= TOC_DEFAULT_DEPTH) {
      collapsed.add(item.id)
    }
  })
  collapsedIds.value = collapsed
  const sanitized = DOMPurify.sanitize(raw)
  // Prepend BASE_URL to absolute image paths (adapts to GitHub Pages subpath)
  let html = sanitized.replace(
    /(<img[^>]*src\s*=\s*["'])\//g,
    `$1${baseUrl}`
  )
  // Add lazy loading, async decoding, and wrap in <picture> with WebP source
  html = html.replace(
    /<img ([^>]*src\s*=\s*["'])([^"']+)(["'][^>]*>)/g,
    (match, beforeSrc, src, afterSrc) => {
      const webpSrc = src.replace(/\.(png|jpg|jpeg)$/i, '.webp')
      return `<picture><source srcset="${webpSrc}" type="image/webp" /><img loading="lazy" decoding="async" ${beforeSrc}${src}${afterSrc}</picture>`
    }
  )
  renderedContent.value = html
}

const baseUrl = import.meta.env.BASE_URL || '/'

onMounted(async () => {
  document.addEventListener('keydown', onKeydown)
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

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
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

  // Every row reserves the same toggle-sized gutter, so labels stay aligned
  // whether or not the entry has children. Indents are one step narrower than
  // the gutter-less layout to keep deep entries inside the 200px sidebar.
  &__toc-row {
    display: flex;
    align-items: flex-start;
    gap: 4px;

    &--h2 {
      padding-left: $spacing-sm;
    }

    &--h3 {
      padding-left: $spacing-lg;
    }
  }

  &__toc-toggle,
  &__toc-spacer {
    flex-shrink: 0;
    width: 14px;
  }

  &__toc-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: 0;
    border: none;
    background: none;
    color: $text-muted;
    cursor: pointer;
    transition: transform $transition-fast, color $transition-fast;

    &:hover {
      color: $accent-primary;
    }

    &--collapsed {
      transform: rotate(-90deg);
    }
  }

  &__toc-item {
    flex: 1;
    min-width: 0;
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
    transition: background $transition-fast,
                color $transition-fast,
                border-color $transition-fast,
                transform $transition-fast;

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

    :deep(picture) {
      display: block;
      margin: $spacing-md auto;
    }

    :deep(img) {
      max-width: 100%;
      height: auto;
      border-radius: $radius-md;
      display: block;
      margin: 0 auto;
      opacity: 0;
      animation: pj-img-fadein 0.4s ease forwards;
    }

    @keyframes pj-img-fadein {
      to { opacity: 1; }
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

    :deep(img) {
      cursor: zoom-in;
    }
  }

  // == Image Lightbox ==
  &__lightbox {
    position: fixed;
    inset: 0;
    z-index: $z-modal;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__lightbox-close {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  &__lightbox-img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: $radius-md;
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.3);
  }

  &__lightbox-frame {
    display: flex;
    align-items: center;
    justify-content: center;
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

  &__website-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: $radius-sm;
    background: $accent-primary;
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

.project-lightbox-enter-active {
  transition: opacity 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.project-lightbox-leave-active {
  transition: opacity 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.project-lightbox-enter-active .project-post__lightbox-frame,
.project-lightbox-leave-active .project-post__lightbox-frame {
  transition: opacity 220ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 220ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: center;
}

.project-lightbox-enter-from,
.project-lightbox-leave-to {
  opacity: 0;
}

.project-lightbox-enter-from .project-post__lightbox-frame {
  opacity: 0;
  transform: scale(0.97);
}

.project-lightbox-leave-to .project-post__lightbox-frame {
  opacity: 0;
  transform: scale(0.98);
}
</style>
