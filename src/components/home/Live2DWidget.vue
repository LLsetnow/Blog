<template>
  <div ref="containerRef" class="live2d-widget">
    <canvas ref="canvasRef" class="live2d-widget__canvas" />
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

const baseUrl = import.meta.env.BASE_URL || '/'
const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const loaded = ref(false)

const MODEL_PATH = `${baseUrl}live2d-models/Hiyori/Hiyori.model3.json`

let app: Application | null = null
let sprite: Live2DSprite | null = null

// Global Config — set before any Live2DSprite instantiation
Config.MotionGroupIdle = 'Idle'
Config.MouseFollow = true
Config.CubismLoggingLevel = LogLevel.LogLevel_Off

onMounted(async () => {
  await nextTick()
  if (!containerRef.value || !canvasRef.value) return

  // 1. Create Live2D sprite (starts resource loading)
  sprite = new Live2DSprite()
  sprite.init({
    modelPath: MODEL_PATH,
    ticker: Ticker.shared,
  })

  // 2. Create Pixi.js Application
  app = new Application()
  await app.init({
    view: canvasRef.value,
    backgroundAlpha: 0,
    resizeTo: containerRef.value,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
  })

  // 3. Wait for model to finish loading
  try {
    await sprite.ready
  } catch {
    // Model file may not exist yet (user hasn't placed their model)
    loaded.value = true // show blank canvas instead of loading spinner
    return
  }

  // 4. Scale sprite to fill container
  const { width: cw, height: ch } = containerRef.value.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  sprite.width = cw * dpr
  sprite.height = ch * dpr

  // 5. Center model — offset so the model sits roughly centered in the widget
  const canvasSize = sprite.getModelCanvasSize()
  if (canvasSize) {
    // The model canvas is in pixels; we need to offset so it's centered
    const scaleX = (cw * dpr) / canvasSize.width
    const scaleY = (ch * dpr) / canvasSize.height
    const scale = Math.min(scaleX, scaleY) * 0.9
    sprite.scale.set(scale)
    // Center the model
    sprite.x = (cw * dpr - canvasSize.width * scale) / 2
    sprite.y = (ch * dpr - canvasSize.height * scale) / 2 + 10
  } else {
    // Fallback: cover the whole area
    sprite.x = 0
    sprite.y = 0
  }

  app.stage.addChild(sprite)

  // 6. Click → play TapBody motion
  sprite.onLive2D('hit', () => {
    sprite?.startRandomMotion({
      group: 'TapBody',
      priority: Priority.Normal,
    })
  })

  loaded.value = true
})

onUnmounted(() => {
  sprite?.destroy()
  app?.destroy(true, { children: true })
  sprite = null
  app = null
})
</script>

<style lang="scss" scoped>
.live2d-widget {
  @include glass;
  border-radius: $radius-xl;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;

  &__canvas {
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: auto;
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
