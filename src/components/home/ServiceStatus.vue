<template>
  <div class="status glass-card">
    <div class="status__header">
      <span class="status__title">服务状态</span>
      <button
        class="status__refresh"
        type="button"
        :disabled="checking"
        :aria-label="checking ? '检测中' : '重新检测'"
        @click="checkAll"
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"
          :class="{ 'status__spin': checking }"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" /><polyline points="21 3 21 9 15 9" />
        </svg>
      </button>
    </div>

    <ul class="status__list">
      <li v-for="site in sites" :key="site.url" class="status__row">
        <span class="status__dot" :class="`status__dot--${site.state}`" />
        <a
          :href="site.url"
          target="_blank"
          rel="noopener noreferrer"
          class="status__name"
          :title="site.url"
        >{{ site.label }}</a>
        <span class="status__latency">{{ latencyText(site) }}</span>
      </li>
    </ul>

    <p class="status__summary">{{ summary }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

type State = 'pending' | 'up' | 'down'

interface Site {
  label: string
  url: string
  state: State
  latency: number | null
}

/** Give up on a probe past this; a site this slow is effectively down. */
const TIMEOUT_MS = 8000
/** Re-probe interval. Long enough not to hammer the endpoints on an idle tab. */
const REFRESH_MS = 60_000

const sites = reactive<Site[]>([
  { label: '博客', url: 'https://akai.ink', state: 'pending', latency: null },
  { label: '雅思批改', url: 'https://ielts.akai.ink', state: 'pending', latency: null },
  { label: 'MioChat', url: 'https://chat.akai.ink', state: 'pending', latency: null },
])

const checking = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

/**
 * Probe one origin from the browser, with no backend.
 *
 * `no-cors` is what makes this possible cross-origin, but it also means the
 * reply is opaque: a resolved promise proves the server answered, not that it
 * answered 200. This is a reachability check, not a health check.
 */
async function probe(site: Site) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const started = performance.now()

  try {
    await fetch(site.url, {
      mode: 'no-cors',
      // Defeat both the HTTP cache and the service worker, or a second probe
      // would report a fabricated 0ms.
      cache: 'no-store',
      signal: controller.signal,
      redirect: 'follow',
    })
    site.latency = Math.round(performance.now() - started)
    site.state = 'up'
  } catch {
    site.latency = null
    site.state = 'down'
  } finally {
    clearTimeout(timeout)
  }
}

async function checkAll() {
  if (checking.value) return
  checking.value = true
  await Promise.all(sites.map(probe))
  checking.value = false
}

function latencyText(site: Site): string {
  if (site.state === 'pending') return '…'
  if (site.state === 'down') return '掉线'
  return `${site.latency}ms`
}

const summary = computed(() => {
  if (sites.some(s => s.state === 'pending')) return '检测中…'
  const down = sites.filter(s => s.state === 'down').length
  return down === 0 ? `全部在线 · ${sites.length} 个服务` : `${down} 个服务异常`
})

/** Skip the interval while the tab is hidden — nobody is looking at it. */
function onVisibility() {
  if (document.hidden) return
  checkAll()
}

onMounted(() => {
  checkAll()
  timer = setInterval(() => {
    if (!document.hidden) checkAll()
  }, REFRESH_MS)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style lang="scss" scoped>
.status {
  @include glass-card;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }

  &__refresh {
    display: flex;
    padding: 2px;
    border: none;
    background: none;
    color: $text-muted;
    cursor: pointer;
    transition: color $transition-fast;

    &:hover:not(:disabled) {
      color: $accent-primary;
    }

    &:disabled {
      cursor: default;
    }
  }

  &__spin {
    animation: status-spin 0.9s linear infinite;
  }

  &__list {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: $spacing-sm;
    list-style: none;
    min-height: 0;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: $text-muted;
    transition: background $transition-base, box-shadow $transition-base;

    &--up {
      background: #38c793;
      // Faint halo so "healthy" reads at a glance without a label.
      box-shadow: 0 0 0 3px rgba(56, 199, 147, 0.22);
    }

    &--down {
      background: #e5585a;
      box-shadow: 0 0 0 3px rgba(229, 88, 90, 0.22);
    }
  }

  &__name {
    flex: 1;
    min-width: 0;
    font-size: $font-size-sm;
    color: $text-secondary;
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color $transition-fast;

    &:hover {
      color: $accent-primary;
    }
  }

  &__latency {
    flex-shrink: 0;
    font-family: $font-mono;
    font-size: $font-size-xs;
    color: $text-muted;
    font-variant-numeric: tabular-nums;
  }

  &__summary {
    font-size: 10px;
    color: $text-muted;
    text-align: right;
  }
}

@keyframes status-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
