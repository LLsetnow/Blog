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
    <Transition name="page" mode="out-in" @after-enter="initPosition">
      <component :is="Component" :key="route.path" />
    </Transition>
  </router-view>

  <!-- Off the home page the player only exists as the corner mini widget, and
       only while something is playing — an idle player following the reader
       around every page is noise. On the home page it stays regardless, since
       it occupies a slot in the canvas layout. -->
  <div v-if="showPlayer" class="player-wrapper" ref="playerRef">
    <TiltEffect :disabled="isMini">
      <MusicPlayer :mini="isMini" />
    </TiltEffect>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import MusicPlayer from '@/components/home/MusicPlayer.vue'
import TiltEffect from '@/components/common/TiltEffect.vue'
import GradientWaves from '@/components/common/GradientWaves.vue'
import { useMusicPlayer } from '@/composables/useMusicPlayer'

const route = useRoute()
const playerRef = ref<HTMLElement | null>(null)
const isMini = ref(false)

const { isPlaying } = useMusicPlayer()

/**
 * Home always shows it; elsewhere only while audio is actually playing.
 *
 * The now playing route is the exception: that page is the player, so the
 * corner widget would just be a second copy of the same controls.
 */
const showPlayer = computed(() => {
  if (route.path === '/now-playing') return false
  return route.path === '/' || isPlaying.value
})

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

/**
 * The wrapper is conditionally rendered, so when playback starts away from the
 * home page it mounts unpositioned. Without this it would appear at the top
 * left until the next route change or resize moved it.
 */
watch(showPlayer, async (visible) => {
  if (!visible) return
  await nextTick()
  initPosition()
})

function retrySyncGrid() {
  if (!syncToGrid()) {
    if (route.path === '/') requestAnimationFrame(retrySyncGrid)
  }
}

// ── Initialise ──

/**
 * Also runs from the route transition's after-enter hook. The route watcher
 * fires while the incoming page is still mid-transform, so measuring the music
 * widget's slot then captures the animation's offset rather than its resting
 * position — the player would settle 12px low, exactly the enter translation.
 */
function initPosition() {
  if (route.path === '/') {
    retrySyncGrid()
  } else {
    syncToCorner()
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  // capture: true — 首页实际滚动发生在 .home-page 内部容器上，scroll 不冒泡，只能在捕获阶段收到
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  initPosition()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll, { capture: true })
})

// ── Resize / Scroll ──

function onResize() {
  if (route.path === '/') {
    syncToGrid()
  } else {
    syncToCorner()
  }
}

let scrollRaf = 0
function onScroll() {
  if (route.path !== '/') return
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    syncToGrid()
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
  z-index: 260;
  will-change: left, top, width, height;
}

.player-wrapper :deep(.music-player--mini) {
  border-radius: 40px;
}
</style>
