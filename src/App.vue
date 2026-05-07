<template>
  <router-view />

  <div class="player-wrapper" ref="playerRef">
    <TiltEffect :disabled="isMini">
      <MusicPlayer :mini="isMini" />
    </TiltEffect>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import MusicPlayer from '@/components/home/MusicPlayer.vue'
import TiltEffect from '@/components/common/TiltEffect.vue'

const route = useRoute()
const playerRef = ref<HTMLElement | null>(null)
const isMini = ref(false)

const POS = {
  cornerW: 160,
  cornerH: 56,
  margin: 24,
}

function applyStyle(styles: Partial<CSSStyleDeclaration>) {
  const e = playerRef.value
  if (!e) return
  for (const [key, val] of Object.entries(styles)) {
    (e.style as any)[key] = val
  }
}

function syncToGrid() {
  const anchor = document.querySelector<HTMLElement>('[data-widget="music"]')
  if (!anchor) return false
  const r = anchor.getBoundingClientRect()
  isMini.value = false
  applyStyle({
    position: 'fixed',
    left: r.left + 'px',
    top: r.top + 'px',
    width: r.width + 'px',
    height: r.height + 'px',
    zIndex: '260',
  })
  return true
}

function syncToCorner() {
  isMini.value = true
  applyStyle({
    position: 'fixed',
    left: (window.innerWidth - POS.cornerW - POS.margin) + 'px',
    top: (window.innerHeight - POS.cornerH - POS.margin) + 'px',
    width: POS.cornerW + 'px',
    height: POS.cornerH + 'px',
    zIndex: '260',
  })
}

// ── Route watcher ──

watch(() => route.path, (path) => {
  if (path === '/') {
    retrySyncGrid()
  } else {
    syncToCorner()
  }
})

function retrySyncGrid() {
  if (!syncToGrid()) {
    if (route.path === '/') requestAnimationFrame(retrySyncGrid)
  }
}

// ── Initialise ──

function initPosition() {
  if (route.path === '/') {
    retrySyncGrid()
  } else {
    syncToCorner()
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  initPosition()
})

onUnmounted(() => window.removeEventListener('resize', onResize))

// ── Resize ──

let resizeTimer: ReturnType<typeof setTimeout>
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (route.path === '/') {
      syncToGrid()
    } else {
      syncToCorner()
    }
  }, 150)
}
</script>

<style lang="scss" scoped>
.player-wrapper {
  position: fixed;
  z-index: 260;
  will-change: left, top, width, height;
}

.player-wrapper :deep(.music-player--mini) {
  border-radius: 40px;
}
</style>
