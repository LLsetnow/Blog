<template>
  <div
    class="route-navigation"
    :class="{
      'route-navigation--ready': isReady,
      'route-navigation--tracking': !animatePosition,
    }"
    :style="shellStyle"
    aria-hidden="true"
  >
    <div class="route-navigation__shell" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

interface Props {
  pageEnteredVersion: number
}

interface NavigationTarget {
  x: number
  y: number
  width: number
  height: number
}

const route = useRoute()
const props = defineProps<Props>()

const isReady = ref(false)
const animatePosition = ref(false)
const target = ref<NavigationTarget>({ x: 0, y: 0, width: 0, height: 0 })

const shellStyle = computed<Record<string, string>>(() => ({
  width: `${target.value.width}px`,
  height: `${target.value.height}px`,
  transform: `translate3d(${target.value.x}px, ${target.value.y}px, 0)`,
}))

let navSyncPending = false
let pendingNavSyncVersion = 0
let navSyncTimeout: ReturnType<typeof window.setTimeout> | null = null
let navMountObserver: MutationObserver | null = null
let observedNavAnchor: HTMLElement | null = null

function measureNavAnchor(): { anchor: HTMLElement; target: NavigationTarget } | null {
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

function setTarget(nextTarget: NavigationTarget, animate: boolean): void {
  animatePosition.value = animate
  target.value = nextTarget
  isReady.value = true
}

function cancelNavSync(): void {
  navSyncPending = false
  pendingNavSyncVersion = 0
  if (navSyncTimeout !== null) {
    window.clearTimeout(navSyncTimeout)
    navSyncTimeout = null
  }
  navMountObserver?.disconnect()
  navMountObserver = null
}

function observeNavMount(): void {
  if (navMountObserver || !document.body) return

  navMountObserver = new MutationObserver(() => {
    flushNavSync()
  })
  navMountObserver.observe(document.body, { childList: true, subtree: true })
}

function observeNavAnchor(anchor: HTMLElement | null): void {
  if (anchor === observedNavAnchor) return
  observedNavAnchor = anchor
}

function syncNavAnchor(animate: boolean): boolean {
  const measured = measureNavAnchor()
  if (!measured) return false

  const { anchor, target: nextTarget } = measured
  observeNavAnchor(anchor)
  setTarget(nextTarget, animate)
  return true
}

function clearNavSyncTracking(): void {
  navSyncPending = false
  pendingNavSyncVersion = 0
  if (navSyncTimeout !== null) {
    window.clearTimeout(navSyncTimeout)
    navSyncTimeout = null
  }
  navMountObserver?.disconnect()
  navMountObserver = null
  animatePosition.value = true
}

function scheduleNavSync(expectedVersion: number): void {
  cancelNavSync()
  navSyncPending = true
  pendingNavSyncVersion = expectedVersion
  observeNavMount()
  navSyncTimeout = window.setTimeout(() => {
    navSyncTimeout = null
    if (route.path === '/now-playing') return
    requestAnimationFrame(() => {
      if (route.path === '/now-playing') return
      if (!syncNavAnchor(false)) {
        observeNavMount()
        return
      }
      clearNavSyncTracking()
    })
  }, 500)
}

function flushNavSync(): void {
  if (!navSyncPending) return
  if (props.pageEnteredVersion < pendingNavSyncVersion) {
    observeNavMount()
    return
  }

  if (!syncNavAnchor(false)) {
    observeNavMount()
    return
  }

  clearNavSyncTracking()
}

watch(
  () => props.pageEnteredVersion,
  async () => {
    if (route.path === '/now-playing') return
    await nextTick()
    if (!syncNavAnchor(false)) {
      scheduleNavSync(props.pageEnteredVersion)
      return
    }
    clearNavSyncTracking()
  },
)

watch(
  () => route.path,
  () => {
    if (route.path === '/now-playing') {
      cancelNavSync()
      isReady.value = false
      return
    }

    scheduleNavSync(Math.max(1, props.pageEnteredVersion))
  },
)

onMounted(async () => {
  await nextTick()
  if (route.path === '/now-playing') return

  if (!syncNavAnchor(false)) {
    scheduleNavSync(Math.max(1, props.pageEnteredVersion))
    return
  }
  clearNavSyncTracking()
})

onBeforeUnmount(() => {
  cancelNavSync()
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
  transition: transform 260ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity 180ms cubic-bezier(0.23, 1, 0.32, 1);

  &--ready {
    opacity: 1;
    visibility: visible;
  }

  &--tracking {
    transition: none;
  }

  &__shell {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.42);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.1);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.24),
      0 8px 24px rgba(33, 89, 105, 0.14);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-navigation {
    transition: opacity 120ms ease;
  }
}
</style>
