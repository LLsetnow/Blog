<template>
  <div
    class="route-navigation"
    :class="{
      'route-navigation--ready': isReady,
      'route-navigation--tracking': !animatePosition,
    }"
    :style="shellStyle"
  >
    <NavMenu v-if="visualMode === 'home'" />
    <RouteChrome
      v-else
      :show-brand="false"
      embedded
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavMenu from '@/components/home/NavMenu.vue'
import RouteChrome from '@/components/layout/RouteChrome.vue'

interface Props {
  pageEnteredVersion: number
}

type NavigationMode = 'home' | 'page'

interface NavigationTarget {
  x: number
  y: number
  width: number
  height: number
}

const MOBILE_BREAKPOINT = 768
const PAGE_RAIL_WIDTH = 154
const PAGE_RAIL_HEIGHT = 472
const MOBILE_RAIL_HEIGHT = 64
const HOME_SYNC_FALLBACK_MS = 500

const route = useRoute()
const props = defineProps<Props>()
const visualMode = ref<NavigationMode>(route.path === '/' ? 'home' : 'page')
const isReady = ref(false)
const animatePosition = ref(false)
const target = ref<NavigationTarget>({ x: 0, y: 0, width: 0, height: 0 })

const shellStyle = computed<Record<string, string>>(() => ({
  width: `${target.value.width}px`,
  height: `${target.value.height}px`,
  transform: `translate3d(${target.value.x}px, ${target.value.y}px, 0)`,
}))

let homeSyncPending = false
let pendingHomeSyncVersion = 0
let homeSyncTimeout: ReturnType<typeof window.setTimeout> | null = null
let homeMountObserver: MutationObserver | null = null
let homeAnchorObserver: MutationObserver | null = null
let observedHomeAnchor: HTMLElement | null = null

function isMobile(): boolean {
  return window.innerWidth <= MOBILE_BREAKPOINT
}

function setTarget(nextTarget: NavigationTarget, animate: boolean): void {
  animatePosition.value = animate
  target.value = nextTarget
  isReady.value = true
}

function getPageFallbackTarget(): NavigationTarget {
  if (isMobile()) {
    return {
      x: 8,
      y: window.innerHeight - 8 - MOBILE_RAIL_HEIGHT,
      width: Math.max(0, window.innerWidth - 16),
      height: MOBILE_RAIL_HEIGHT,
    }
  }

  return {
    x: window.innerWidth - 18 - PAGE_RAIL_WIDTH,
    y: Math.max(16, (window.innerHeight - PAGE_RAIL_HEIGHT) / 2),
    width: PAGE_RAIL_WIDTH,
    height: PAGE_RAIL_HEIGHT,
  }
}

function measureHomeAnchor(): { anchor: HTMLElement; target: NavigationTarget } | null {
  const anchor = document.querySelector<HTMLElement>('[data-widget="nav"]')
  if (!anchor) return null

  const rect = anchor.getBoundingClientRect()
  return {
    anchor,
    target: {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    },
  }
}

function measurePageRail(): NavigationTarget | null {
  const rail = document.querySelector<HTMLElement>('.route-navigation [data-widget="nav-page"]')
  if (!rail) return null

  const rect = rail.getBoundingClientRect()
  const fallback = getPageFallbackTarget()
  const width = rect.width || fallback.width
  const height = rect.height || fallback.height
  return isMobile()
    ? {
        x: 8,
        y: window.innerHeight - 8 - height,
        width,
        height,
      }
    : {
        x: window.innerWidth - 18 - width,
        y: Math.max(16, (window.innerHeight - height) / 2),
        width,
        height,
      }
}

function observeHomeAnchor(anchor: HTMLElement | null): void {
  if (anchor === observedHomeAnchor) return

  homeAnchorObserver?.disconnect()
  homeAnchorObserver = null
  observedHomeAnchor = anchor
  if (!anchor) return

  homeAnchorObserver = new MutationObserver(() => {
    if (route.path === '/') syncHomeAnchor(false)
  })
  homeAnchorObserver.observe(anchor, { attributes: true, attributeFilter: ['style'] })
}

function syncHomeAnchor(animate: boolean): boolean {
  if (route.path !== '/') return false

  const measured = measureHomeAnchor()
  if (!measured) return false

  observeHomeAnchor(measured.anchor)
  visualMode.value = 'home'
  setTarget(measured.target, animate)
  return true
}

function syncPageRail(animate: boolean): boolean {
  if (route.path === '/' || route.path === '/now-playing') return false

  const measured = measurePageRail()
  if (!measured) return false

  setTarget(measured, animate)
  return true
}

function cancelHomeSync(): void {
  homeSyncPending = false
  pendingHomeSyncVersion = 0
  if (homeSyncTimeout !== null) {
    window.clearTimeout(homeSyncTimeout)
    homeSyncTimeout = null
  }
  homeMountObserver?.disconnect()
  homeMountObserver = null
}

function observeHomeMount(): void {
  if (homeMountObserver || !document.body) return

  homeMountObserver = new MutationObserver(() => {
    flushHomeSync()
  })
  homeMountObserver.observe(document.body, { childList: true, subtree: true })
}

function clearHomeSyncTracking(): void {
  homeSyncPending = false
  pendingHomeSyncVersion = 0
  if (homeSyncTimeout !== null) {
    window.clearTimeout(homeSyncTimeout)
    homeSyncTimeout = null
  }
  homeMountObserver?.disconnect()
  homeMountObserver = null
  animatePosition.value = true
}

function scheduleHomeSync(expectedVersion: number): void {
  cancelHomeSync()
  homeSyncPending = true
  pendingHomeSyncVersion = expectedVersion
  observeHomeMount()
  homeSyncTimeout = window.setTimeout(() => {
    homeSyncTimeout = null
    if (route.path !== '/') return

    requestAnimationFrame(() => {
      if (route.path !== '/') return
      if (syncHomeAnchor(isReady.value)) clearHomeSyncTracking()
    })
  }, HOME_SYNC_FALLBACK_MS)
}

function flushHomeSync(): void {
  if (!homeSyncPending || route.path !== '/') return
  if (props.pageEnteredVersion < pendingHomeSyncVersion) return

  if (syncHomeAnchor(isReady.value)) clearHomeSyncTracking()
}

async function syncPageAfterRender(animate: boolean): Promise<void> {
  await nextTick()
  requestAnimationFrame(() => {
    if (!syncPageRail(animate)) setTarget(getPageFallbackTarget(), animate)
  })
}

function onRouteChange(path: string): void {
  cancelHomeSync()
  observeHomeAnchor(null)

  if (path === '/now-playing') {
    isReady.value = false
    return
  }

  if (path === '/') {
    visualMode.value = 'home'
    scheduleHomeSync(props.pageEnteredVersion + 1)
    return
  }

  visualMode.value = 'page'
  setTarget(getPageFallbackTarget(), true)
  void syncPageAfterRender(true)
}

function onResize(): void {
  if (route.path === '/') {
    syncHomeAnchor(false)
  } else if (route.path !== '/now-playing') {
    setTarget(getPageFallbackTarget(), false)
    void syncPageAfterRender(false)
  }
}

function onScroll(): void {
  if (route.path === '/') syncHomeAnchor(false)
}

watch(() => route.path, onRouteChange)

watch(
  () => props.pageEnteredVersion,
  async () => {
    if (route.path !== '/') return
    await nextTick()
    if (syncHomeAnchor(isReady.value)) clearHomeSyncTracking()
  },
)

onMounted(async () => {
  await nextTick()
  if (route.path === '/') {
    if (!syncHomeAnchor(false)) scheduleHomeSync(Math.max(1, props.pageEnteredVersion))
    else clearHomeSyncTracking()
  } else if (route.path !== '/now-playing') {
    visualMode.value = 'page'
    setTarget(getPageFallbackTarget(), false)
    await syncPageAfterRender(false)
  }

  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
})

onBeforeUnmount(() => {
  cancelHomeSync()
  observeHomeAnchor(null)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll, { capture: true })
})
</script>

<style lang="scss" scoped>
.route-navigation {
  position: fixed;
  top: 0;
  left: 0;
  z-index: $z-sticky + 10;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  will-change: transform;
  transition:
    transform 260ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 180ms cubic-bezier(0.23, 1, 0.32, 1);

  &--ready {
    pointer-events: auto;
    opacity: 1;
    visibility: visible;
  }

  &--tracking {
    transition: none;
  }

  :deep(.nav-menu),
  :deep(.route-chrome--embedded) {
    width: 100%;
    height: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-navigation {
    transition: opacity 120ms ease;

    &--tracking {
      transition: opacity 120ms ease;
    }
  }
}
</style>
