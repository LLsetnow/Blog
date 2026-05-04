<template>
  <div ref="containerRef" class="live2d-widget">
    <!-- Glass background — clipped to widget bounds -->
    <div class="live2d-widget__bg" />
    <!-- Canvas wrapper — can overflow the glass panel -->
    <div ref="canvasWrapRef" class="live2d-widget__canvas-wrap">
      <canvas ref="canvasRef" class="live2d-widget__canvas" />
    </div>
    <div v-if="!loaded" class="live2d-widget__placeholder">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" class="live2d-widget__spinner" />
      </svg>
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Application, Ticker } from 'pixi.js'
import { Config, Live2DSprite, LogLevel, Priority } from 'easy-live2d'
import type { Live2DConfig } from '@/types'

const props = defineProps<{
  config: Live2DConfig
}>()

const OVERFLOW_PX = 60

const baseUrl = import.meta.env.BASE_URL || '/'
const containerRef = ref<HTMLDivElement>()
const canvasWrapRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const loaded = ref(false)

const MODEL_PATH = `${baseUrl}live2d-models/Hiyori/Hiyori.model3.json`

let app: Application | null = null
let sprite: Live2DSprite | null = null
let ro: ResizeObserver | null = null

// Global Config — set before any Live2DSprite instantiation
Config.MotionGroupIdle = 'Idle'
Config.MouseFollow = true
Config.CubismLoggingLevel = LogLevel.LogLevel_Off

function syncCanvasSize() {
  if (!containerRef.value || !canvasWrapRef.value || !canvasRef.value) return
  const { width: cw, height: ch } = containerRef.value.getBoundingClientRect()
  const canvasW = Math.ceil(cw + OVERFLOW_PX * 2)
  const canvasH = Math.ceil(ch + OVERFLOW_PX * 2)
  const dpr = window.devicePixelRatio || 1

  const wrap = canvasWrapRef.value
  wrap.style.width = `${canvasW}px`
  wrap.style.height = `${canvasH}px`
  wrap.style.left = `${-OVERFLOW_PX}px`
  wrap.style.top = `${-OVERFLOW_PX}px`

  if (app) {
    app.renderer.resize(Math.ceil(canvasW * dpr), Math.ceil(canvasH * dpr))
  }

  // Reposition model if already loaded
  if (sprite?.ready) {
    applyModelLayout()
  }
}

function applyModelLayout() {
  if (!sprite || !containerRef.value || !canvasWrapRef.value) return
  const canvasSize = sprite.getModelCanvasSize()
  if (!canvasSize) return

  const { width: cw, height: ch } = containerRef.value.getBoundingClientRect()
  const vw = Math.ceil(cw + OVERFLOW_PX * 2)
  const vh = Math.ceil(ch + OVERFLOW_PX * 2)
  const dpr = window.devicePixelRatio || 1
  const { modelScale, offsetX, offsetY } = props.config

  const scale = Math.min(vw / canvasSize.width, vh / canvasSize.height) * modelScale
  sprite.scale.set(scale)
  sprite.x = (vw * dpr - canvasSize.width * scale) / 2 + offsetX
  sprite.y = (vh * dpr - canvasSize.height * scale) / 2 + offsetY
}

onMounted(async () => {
  await nextTick()
  if (!containerRef.value || !canvasRef.value) return

  // 1. Create Live2D sprite
  sprite = new Live2DSprite()
  sprite.init({
    modelPath: MODEL_PATH,
    ticker: Ticker.shared,
  })

  // 2. Create Pixi.js Application (no resizeTo — we manage sizing manually)
  app = new Application()
  await app.init({
    view: canvasRef.value,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
  })

  // 3. Sync canvas size and add to stage
  syncCanvasSize()
  app.stage.addChild(sprite)

  // 4. Wait for model to finish loading
  try {
    await sprite.ready
  } catch {
    loaded.value = true
    return
  }

  // 5. Apply size/position from config
  applyModelLayout()

  // 6. Click → play TapBody motion
  sprite.onLive2D('hit', () => {
    sprite?.startRandomMotion({
      group: 'TapBody',
      priority: Priority.Normal,
    })
  })

  loaded.value = true

  // 7. Observe container size changes
  ro = new ResizeObserver(() => {
    syncCanvasSize()
    applyModelLayout()
  })
  ro.observe(containerRef.value)
})

onUnmounted(() => {
  ro?.disconnect()
  ro = null
  sprite?.destroy()
  app?.destroy(true, { children: true })
  sprite = null
  app = null
})
</script>

<style lang="scss" scoped>
.live2d-widget {
  position: relative;
  overflow: visible;
  width: 100%;
  height: 100%;

  // Glass background — clipped to widget bounds
  &__bg {
    position: absolute;
    inset: 0;
    @include glass;
    border-radius: $radius-xl;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  // Canvas wrapper — can overflow the glass panel
  &__canvas-wrap {
    position: absolute;
    overflow: visible;
    pointer-events: auto;
    z-index: 1;
  }

  &__canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    color: $text-muted;
    font-size: $font-size-xs;
    pointer-events: none;
    z-index: 2;

    span {
      user-select: none;
    }
  }

  &__spinner {
    animation: l2d-spin 1.5s linear infinite;
  }

  @keyframes l2d-spin {
    to { transform: rotate(360deg); }
  }
}
</style>
