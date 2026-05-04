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

const HARDCODED_SCALE = 1.0
const HARDCODED_OFFSET_Y = 0

const baseUrl = import.meta.env.BASE_URL || '/'
const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const loaded = ref(false)

const MODEL_PATH = `${baseUrl}live2d-models/Hiyori/Hiyori.model3.json`

let app: Application | null = null
let sprite: Live2DSprite | null = null
let ro: ResizeObserver | null = null

Config.MotionGroupIdle = 'Idle'
Config.MouseFollow = true
Config.CubismLoggingLevel = LogLevel.LogLevel_Off

function applyModelLayout() {
  if (!sprite || !sprite.ready || !containerRef.value) return
  const canvasSize = sprite.getModelCanvasSize()
  if (!canvasSize) return

  const { width: cw, height: ch } = containerRef.value.getBoundingClientRect()
  const scale = Math.min(cw / canvasSize.width, ch / canvasSize.height) * HARDCODED_SCALE

  sprite.scale.set(scale)
  sprite.x = (cw - canvasSize.width * scale) / 2
  sprite.y = HARDCODED_OFFSET_Y
}

onMounted(async () => {
  await nextTick()
  if (!containerRef.value || !canvasRef.value) return

  sprite = new Live2DSprite()
  sprite.init({
    modelPath: MODEL_PATH,
    ticker: Ticker.shared,
  })

  app = new Application()
  await app.init({
    view: canvasRef.value,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
  })

  app.stage.addChild(sprite)
  app.stage.eventMode = 'static'

  const { width: cw, height: ch } = containerRef.value.getBoundingClientRect()
  app.renderer.resize(cw, ch)

  try {
    await sprite.ready
  } catch {
    loaded.value = true
    return
  }

  applyModelLayout()

  sprite.onLive2D('hit', () => {
    sprite?.startRandomMotion({
      group: 'TapBody',
      priority: Priority.Normal,
    })
  })

  loaded.value = true

  ro = new ResizeObserver(() => {
    if (!containerRef.value) return
    const { width: cw, height: ch } = containerRef.value.getBoundingClientRect()
    app?.renderer.resize(cw, ch)
    applyModelLayout()
  })
  ro.observe(containerRef.value)
})

onUnmounted(() => {
  ro?.disconnect()
  ro = null
  if (app) {
    app.destroy(false, { children: true })
  }
  sprite = null
  app = null
})
</script>

<style lang="scss" scoped>
.live2d-widget {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: auto;

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
