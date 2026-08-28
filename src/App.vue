<template>
  <!-- Fixed host: GradientWaves fills its container, so the container is what
       pins it behind the page. pointer-events stays off or it would swallow
       every click; the shader tracks the cursor via a window listener. -->
  <div class="site-backdrop">
    <GradientWaves
      horizon-color="#c8d8ff"
      wave-color="#7ec8e3"
      crest-color="#FFFFFF"
      :speed="0.4"
      :amplitude="2.5"
      :wave-scale="0.6"
      :wave-ratio="0.9"
      :swell="35"
      :turbulence="20"
      :tilt="1.11"
      :zoom="1.0"
      :height="2.0"
      :fog-depth="35"
      detail="medium"
      :brightness="1.0"
      :opacity="1.0"
      :mouse-interaction="true"
      :parallax-strength="0.5"
      :grain="true"
      :grain-intensity="0.05"
    />
  </div>

  <!-- out-in rather than overlapping: the home page is an absolutely
       positioned canvas and the others are normal flow, so cross-fading them
       in place would have them fight over the same space. -->
  <router-view v-slot="{ Component }">
    <Transition :name="isHomeRoute ? 'page-home' : 'page'" mode="out-in" @after-enter="onPageEntered">
      <component :is="Component" :key="route.path" />
    </Transition>
  </router-view>

  <RouteChrome v-if="showRouteChrome" />

  <RouteNavigation
    v-if="route.path !== '/now-playing'"
    :page-entered-version="pageEnteredVersion"
  />

  <div
    v-if="route.path === '/'"
    class="player-wrapper"
    ref="playerRef"
    :style="{ visibility: isPlayerPositioned ? 'visible' : 'hidden' }"
  >
    <MusicPlayer />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import MusicPlayer from '@/components/home/MusicPlayer.vue'
import GradientWaves from '@/components/common/GradientWaves.vue'
import RouteChrome from '@/components/layout/RouteChrome.vue'
import RouteNavigation from '@/components/layout/RouteNavigation.vue'

const route = useRoute()
const isHomeRoute = computed(() => route.path === '/')
const contentRouteNames = new Set([
  'Favorites',
  'BlogList',
  'BlogPost',
  'Projects',
  'ProjectPost',
  'News',
  'About',
])
const showRouteChrome = computed(() => (
  typeof route.name === 'string' && contentRouteNames.has(route.name)
))
const playerRef = ref<HTMLElement | null>(null)
const isPlayerPositioned = ref(false)
const pageEnteredVersion = ref(0)

function applyStyle(styles: Partial<CSSStyleDeclaration>) {
  const e = playerRef.value
  if (!e) return
  for (const [key, val] of Object.entries(styles)) {
    (e.style as any)[key] = val
  }
}

function syncToGrid() {
  const anchor = document.querySelector<HTMLElement>('[data-widget="music"]')
  const player = playerRef.value
  if (!anchor || !player) return false
  const r = anchor.getBoundingClientRect()
  applyStyle({
    transform: `translate3d(${r.left}px, ${r.top}px, 0)`,
    width: r.width + 'px',
    height: r.height + 'px',
    zIndex: '260',
  })
  return true
}

function syncGridTransform() {
  const anchor = document.querySelector<HTMLElement>('[data-widget="music"]')
  if (!anchor || !playerRef.value) return false
  const r = anchor.getBoundingClientRect()
  applyStyle({
    transform: `translate3d(${r.left}px, ${r.top}px, 0)`,
  })
  return true
}

// ── Route watcher ──

watch(() => route.path, (path) => {
  cancelGridSyncRetry()
  isPlayerPositioned.value = false
  if (path === '/') retrySyncGrid()
})

const MAX_GRID_SYNC_RETRIES = 120
let gridSyncRetryRaf: number | null = null
let gridSyncRetryCount = 0

function cancelGridSyncRetry() {
  if (gridSyncRetryRaf !== null) {
    cancelAnimationFrame(gridSyncRetryRaf)
    gridSyncRetryRaf = null
  }
  gridSyncRetryCount = 0
}

function retrySyncGrid() {
  if (route.path !== '/') {
    cancelGridSyncRetry()
    return
  }

  if (syncToGrid()) {
    cancelGridSyncRetry()
    isPlayerPositioned.value = true
    return
  }

  if (gridSyncRetryRaf !== null || gridSyncRetryCount >= MAX_GRID_SYNC_RETRIES) return

  gridSyncRetryRaf = requestAnimationFrame(() => {
    gridSyncRetryRaf = null
    gridSyncRetryCount += 1
    retrySyncGrid()
  })
}

// ── Initialise ──

/**
 * Also runs from the route transition's after-enter hook. The route watcher
 * fires while the incoming page is still mid-transform, so measuring the music
 * widget's slot then captures the animation's offset rather than its resting
 * position — the player would settle 12px low, exactly the enter translation.
 */
function initPosition() {
  if (route.path === '/') retrySyncGrid()
}

/**
 * Follow the music widget's slot when the layout editor moves it.
 *
 * The player lives here rather than in the canvas, and repositions on route
 * change, resize, scroll and page transitions — none of which fire when a
 * widget is dragged. Committing a drag rewrote the slot's inline style and the
 * player stayed where it was, so every other widget moved and this one did not.
 *
 * Watching the anchor's own style attribute keeps App unaware of drag mode,
 * which it has no other reason to know about.
 */
let anchorObserver: MutationObserver | null = null

function observeAnchor() {
  anchorObserver?.disconnect()
  const anchor = document.querySelector<HTMLElement>('[data-widget="music"]')
  if (!anchor) return
  anchorObserver = new MutationObserver(() => {
    if (route.path === '/') syncToGrid()
  })
  anchorObserver.observe(anchor, { attributes: true, attributeFilter: ['style'] })
}

/** The anchor is a fresh element after every route change, so re-bind to it. */
function onPageEntered() {
  initPosition()
  observeAnchor()
  pageEnteredVersion.value += 1
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  // capture: true — 首页实际滚动发生在 .home-page 内部容器上，scroll 不冒泡，只能在捕获阶段收到
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  initPosition()
  observeAnchor()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll, { capture: true })
  cancelGridSyncRetry()
  anchorObserver?.disconnect()
})

// ── Resize / Scroll ──

function onResize() {
  if (route.path === '/') syncToGrid()
}

let scrollRaf = 0
function onScroll() {
  if (route.path !== '/') return
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    syncGridTransform()
  })
}
</script>

<style lang="scss" scoped>
.site-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.player-wrapper {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 260;
  will-change: transform;
}

</style>
