<template>
  <router-view />

  <!-- Single MusicPlayer instance — positioned via JS for FLIP animation -->
  <div class="player-wrapper" ref="playerRef">
    <TiltEffect :disabled="isMini">
      <MusicPlayer />
    </TiltEffect>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import MusicPlayer from '@/components/home/MusicPlayer.vue'
import TiltEffect from '@/components/common/TiltEffect.vue'

const route = useRoute()
const playerRef = ref<HTMLElement | null>(null)
const isMini = ref(false)

// Direct DOM manipulation for positioning (avoids Vue reactive timing issues)
const POS = {
  cornerW: 170,
  cornerH: 80,
  margin: 24,
}

function el(): HTMLElement | null {
  return playerRef.value
}

function applyStyle(styles: Partial<CSSStyleDeclaration>) {
  const e = el()
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
    overflow: 'hidden',
    zIndex: '260',
    borderRadius: '12px',
    transition: 'none',
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
    overflow: 'hidden',
    zIndex: '260',
    borderRadius: '12px',
    transition: 'none',
  })
}

// ── FLIP animations ──

function animateLeaveHome() {
  if (!syncToGrid()) return
  nextTick(() => {
    requestAnimationFrame(() => {
      applyStyle({
        left: (window.innerWidth - POS.cornerW - POS.margin) + 'px',
        top: (window.innerHeight - POS.cornerH - POS.margin) + 'px',
        width: POS.cornerW + 'px',
        height: POS.cornerH + 'px',
        borderRadius: '12px',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        zIndex: '260',
        position: 'fixed',
      })
      setTimeout(() => {
        isMini.value = true
        applyStyle({ transition: 'none' })
      }, 370)
    })
  })
}

function animateEnterHome() {
  syncToCorner()
  isMini.value = false
  nextTick(() => {
    requestAnimationFrame(() => {
      syncToGrid()
      applyStyle({
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: '12px',
      })
    })
  })
}

// ── Route watcher ──

watch(() => route.path, (path, oldPath) => {
  if (oldPath === '/' && path !== '/') {
    animateLeaveHome()
  } else if (path === '/') {
    animateEnterHome()
  } else {
    syncToCorner()
  }
})

// ── Initialise ──

function initPosition() {
  if (route.path === '/') {
    if (!syncToGrid()) {
      // Grid anchor not ready yet — retry
      requestAnimationFrame(initPosition)
      return
    }
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
  overflow: hidden;
  z-index: 260;
  will-change: left, top, width, height;
}

</style>
