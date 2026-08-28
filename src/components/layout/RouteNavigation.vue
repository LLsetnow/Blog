<template>
  <div
    class="route-navigation"
    :class="{
      'route-navigation--home': visualMode === 'home',
      'route-navigation--page': visualMode === 'page',
      'route-navigation--ready': isReady,
      'route-navigation--tracking': !animatePosition,
    }"
    :style="shellStyle"
  >
    <button
      v-if="visualMode === 'page' && isMobile"
      type="button"
      class="route-navigation__toggle"
      :aria-expanded="menuOpen"
      :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
      @click="menuOpen = !menuOpen"
    >
      <span class="route-navigation__avatar" aria-hidden="true">A</span>
      <span class="route-navigation__toggle-icon" aria-hidden="true">
        <svg v-if="!menuOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    </button>

    <Transition name="route-navigation-menu">
      <NavMenu
        v-if="visualMode === 'home' || !isMobile || menuOpen"
        :variant="visualMode"
        :on-navigate="navigateTo"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavMenu from '@/components/home/NavMenu.vue'

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
const HOME_SYNC_FALLBACK_MS = 500
const PAGE_NAV_WIDTH = 306
const PAGE_NAV_HEIGHT = 32
const MOBILE_NAV_WIDTH = 96
const MOBILE_NAV_HEIGHT = 44

const route = useRoute()
const router = useRouter()
const props = defineProps<Props>()
const visualMode = ref<NavigationMode>(route.path === '/' ? 'home' : 'page')
const isMobile = ref<boolean>(window.innerWidth <= MOBILE_BREAKPOINT)
const menuOpen = ref<boolean>(false)
const isReady = ref<boolean>(false)
const animatePosition = ref<boolean>(false)
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

/** Apply a viewport target while preserving the CSS transform transition. */
function setTarget(nextTarget: NavigationTarget, animate: boolean): void {
  animatePosition.value = animate
  target.value = nextTarget
  isReady.value = true
}

/** Calculate the fixed position occupied by AppLayout's page navigation. */
function getPageTarget(): NavigationTarget {
  if (isMobile.value) {
    return {
      x: window.innerWidth - 16 - MOBILE_NAV_WIDTH,
      y: 8,
      width: MOBILE_NAV_WIDTH,
      height: MOBILE_NAV_HEIGHT,
    }
  }

  const containerWidth = Math.min(1200, window.innerWidth)
  const rightInset = (window.innerWidth - containerWidth) / 2 + 24
  return {
    x: Math.max(16, window.innerWidth - rightInset - PAGE_NAV_WIDTH),
    y: 16,
    width: PAGE_NAV_WIDTH,
    height: PAGE_NAV_HEIGHT,
  }
}

/** Stop the bounded home-anchor lookup when the route or viewport changes. */
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

/** Wait for the home anchor to enter the DOM after route transition mount. */
function observeHomeMount(): void {
  if (homeMountObserver || !document.body) return

  homeMountObserver = new MutationObserver(() => {
    flushHomeSync()
  })
  homeMountObserver.observe(document.body, { childList: true, subtree: true })
}

/** Rebind the observer to the current editable home navigation anchor. */
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

/** Move the persistent shell to the actual, scaled home layout anchor. */
function syncHomeAnchor(animate: boolean): boolean {
  if (route.path !== '/') return false

  const measured = measureHomeAnchor()
  if (!measured) return false

  const { anchor, target: nextTarget } = measured
  observeHomeAnchor(anchor)
  visualMode.value = 'home'
  setTarget(nextTarget, animate)
  return true
}

/** Clear the temporary home-sync tracking state after a successful sync. */
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

/** Prime the home synchronization path for the next anchor measurement. */
function scheduleHomeSync(expectedVersion: number): void {
  cancelHomeSync()
  homeSyncPending = true
  pendingHomeSyncVersion = expectedVersion
  observeHomeMount()
  if (homeSyncTimeout !== null) {
    window.clearTimeout(homeSyncTimeout)
  }
  homeSyncTimeout = window.setTimeout(() => {
    homeSyncTimeout = null
    if (route.path !== '/') return
    requestAnimationFrame(() => {
      if (route.path !== '/') return
      syncHomeAnchor(false)
      clearHomeSyncTracking()
    })
  }, HOME_SYNC_FALLBACK_MS)
}

/** Synchronize once the home route has fully entered and the anchor exists. */
function flushHomeSync(): void {
  if (route.path !== '/' || !homeSyncPending) return
  if (props.pageEnteredVersion < pendingHomeSyncVersion) {
    observeHomeMount()
    return
  }

  if (!syncHomeAnchor(false)) {
    observeHomeMount()
    return
  }

  clearHomeSyncTracking()
}

/** Retarget the shell before router-view starts its out-in transition. */
function navigateTo(path: string): void {
  menuOpen.value = false

  if (path === route.path) return

  cancelHomeSync()
  if (path === '/') {
    // The destination anchor is mounted with HomePage. Keep the current page
    // presentation until it exists, then animate the same shell into place.
    scheduleHomeSync(props.pageEnteredVersion + 1)
  } else {
    visualMode.value = 'page'
    observeHomeAnchor(null)
    setTarget(getPageTarget(), true)
  }

  void router.push(path)
}

/** Retarget navigation after browser back/forward or a direct route change. */
function onRouteChange(path: string): void {
  menuOpen.value = false
  cancelHomeSync()

  if (path === '/') {
    scheduleHomeSync(props.pageEnteredVersion + 1)
    return
  }

  visualMode.value = 'page'
  observeHomeAnchor(null)
  setTarget(getPageTarget(), true)
}

/** Update the responsive target without animating ordinary viewport tracking. */
function onResize(): void {
  isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT
  if (route.path === '/') {
    syncHomeAnchor(false)
  } else {
    setTarget(getPageTarget(), false)
  }
}

/** Follow the transformed home canvas without leaving a transition trail. */
function onScroll(): void {
  if (route.path === '/') syncHomeAnchor(false)
}

watch(() => route.path, onRouteChange)

watch(
  () => props.pageEnteredVersion,
  async () => {
    if (route.path !== '/') return
    await nextTick()
    if (!syncHomeAnchor(false)) {
      scheduleHomeSync(props.pageEnteredVersion)
      return
    }
    clearHomeSyncTracking()
  },
)

onMounted(async () => {
  await nextTick()
  if (route.path === '/') {
    if (!syncHomeAnchor(false)) {
      scheduleHomeSync(Math.max(1, props.pageEnteredVersion))
      return
    }
    clearHomeSyncTracking()
  } else {
    setTarget(getPageTarget(), false)
  }

  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
})

onBeforeUnmount(() => {
  cancelHomeSync()
  homeAnchorObserver?.disconnect()
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
  will-change: transform;
  opacity: 0;
  visibility: hidden;
  transition: transform 260ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity 180ms cubic-bezier(0.23, 1, 0.32, 1);

  &--ready {
    pointer-events: auto;
    opacity: 1;
    visibility: visible;
  }

  &--tracking {
    transition: none;
  }

  &__toggle {
    display: none;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding: 6px 10px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.5),
      inset 0 0 8px 2px rgba(255, 255, 255, 0.1);
    color: $text-secondary;
    cursor: pointer;

    &:active {
      transform: scale(0.97);
    }
  }

  &__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    margin-right: 4px;
    border-radius: 50%;
    background: $accent-gradient;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
  }

  &__toggle-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    color: $text-secondary;
  }
}

.route-navigation-menu-enter-active,
.route-navigation-menu-leave-active {
  transition: opacity 180ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
}

.route-navigation-menu-enter-from,
.route-navigation-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

@media (max-width: $breakpoint-md) {
  .route-navigation {
    &--page .route-navigation__toggle {
      display: flex;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-navigation {
    transition: opacity 120ms ease;

    &--tracking {
      transition: none;
    }
  }

  .route-navigation-menu-enter-active,
  .route-navigation-menu-leave-active {
    transition: opacity 120ms ease;
  }

  .route-navigation-menu-enter-from,
  .route-navigation-menu-leave-to {
    transform: none;
  }
}
</style>
