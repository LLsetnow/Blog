<template>
  <div class="home-page">
    <div
      ref="socialRow"
      class="home-page__container"
      :style="canvasStyle"
      @pointermove="onSocialPointerMove"
      @pointerleave="onSocialPointerLeave"
    >
      <!-- Greeting -->
      <div class="home-page__cell" :style="getWidgetStyle('greeting')">
        <HoverTilt>
          <GreetingCard />
        </HoverTilt>
      </div>

      <!-- Contribution heatmap (hidden on mobile) -->
      <div v-if="!isMobile" class="home-page__cell" data-widget="contributions" :style="getWidgetStyle('contributions')">
        <ContributionHeatmap />
      </div>

      <!-- GitHub + Email + WeChat (horizontal row on mobile) -->
      <div class="home-page__icon-row">
        <div class="home-page__cell" :style="getWidgetStyle('github')">
          <HoverTilt>
            <GitHubCard />
          </HoverTilt>
        </div>
        <div class="home-page__cell" :style="getWidgetStyle('email')">
          <EmailWidget />
        </div>
        <div class="home-page__cell" :style="getWidgetStyle('wechat')">
          <WeChatWidget />
        </div>
        <div class="home-page__cell" :style="getWidgetStyle('bilibili')">
          <BilibiliWidget />
        </div>
      </div>

      <!-- Decorative glass bridge connecting the four social controls. -->
      <svg
        v-if="socialConnectionPaths.length"
        class="home-page__social-connection"
        :viewBox="`0 0 ${socialConnectionFrame.width} ${socialConnectionFrame.height}`"
        :style="{
          left: `${socialConnectionFrame.left}px`,
          top: `${socialConnectionFrame.top}px`,
          width: `${socialConnectionFrame.width}px`,
          height: `${socialConnectionFrame.height}px`,
        }"
        aria-hidden="true"
        focusable="false"
      >
        <path
          v-for="(path, index) in socialConnectionPaths"
          :key="`social-bridge-${index}`"
          class="home-page__social-connection-bridge"
          :d="path"
        />
      </svg>

      <!-- Nav (horizontal on mobile) -->
      <div class="home-page__cell home-page__nav-cell" data-widget="nav" :style="getWidgetStyle('nav')">
        <NavMenu />
      </div>

      <!-- Service status (hidden on mobile) -->
      <div v-if="!isMobile" class="home-page__cell" :style="getWidgetStyle('status')">
        <ServiceStatus />
      </div>

      <!-- Scheduled task status (hidden on mobile with service status) -->
      <div v-if="!isMobile" class="home-page__cell" :style="getWidgetStyle('cron')">
        <CronTasks />
      </div>

      <!-- Gallery -->
      <div class="home-page__cell" :style="getWidgetStyle('gallery')">
        <HoverTilt>
          <ImageGallery />
        </HoverTilt>
      </div>

      <!-- Music Player (position anchor for global player) -->
      <div data-widget="music" class="home-page__cell" :style="getWidgetStyle('music')" />

      <!-- Settings button (hidden on mobile) -->
      <button v-if="!isMobile" class="home-page__settings-btn" @click="openSettings">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>

      <!-- Drag overlay (visual only, covers page to prevent clicks) -->
      <div v-if="isDragMode" class="home-page__drag-overlay" />

      <!-- Drag handles (in drag mode) -->
      <div
        v-for="w in layouts"
        :key="'handle-' + w.id"
        v-show="isDragMode"
        class="home-page__drag-handle"
        :class="{ 'home-page__drag-handle--active': draggingId === w.id }"
        :style="dragHandleStyle(w)"
        @pointerdown.prevent="startDrag(w.id, $event)"
        @pointermove="onDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      />

      <!-- Save / Cancel buttons -->
      <div v-if="isDragMode" class="home-page__drag-actions">
        <button class="home-page__drag-btn home-page__drag-btn--save" @click="saveOffsets">
          保存偏移
        </button>
        <button class="home-page__drag-btn home-page__drag-btn--cancel" @click="cancelDrag">
          取消
        </button>
      </div>
    </div>

    <!-- Toast notifications -->
    <ToastNotification :toasts="toasts" />

    <!-- Settings modal -->
    <LayoutSettings
      :open="isSettingsOpen"
      :widgets="layouts"
      @close="closeSettings"
      @drag="enterDragMode"
      @update-size="updateSize"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { WidgetLayout } from '@/types'
import GreetingCard from '@/components/home/GreetingCard.vue'
import ServiceStatus from '@/components/home/ServiceStatus.vue'
import CronTasks from '@/components/home/CronTasks.vue'
import ContributionHeatmap from '@/components/home/ContributionHeatmap.vue'
import NavMenu from '@/components/home/NavMenu.vue'
import GitHubCard from '@/components/home/GitHubCard.vue'
import ImageGallery from '@/components/home/ImageGallery.vue'

import EmailWidget from '@/components/home/EmailWidget.vue'
import WeChatWidget from '@/components/home/WeChatWidget.vue'
import BilibiliWidget from '@/components/home/BilibiliWidget.vue'
import LayoutSettings from '@/components/home/LayoutSettings.vue'
import HoverTilt from '@/components/common/HoverTilt.vue'
import ToastNotification from '@/components/common/ToastNotification.vue'
import { useToast } from '@/composables/useToast'
import { useLayoutEditor } from '@/composables/useLayoutEditor'

/**
 * Viewport the hand-positioned canvas was laid out against.
 *
 * Widgets sit at absolute coordinates that overhang the 1100px container, so a
 * centred container needs 1100 + 2x the wider overhang to clear its widest
 * side. Below that the canvas is scaled down rather than clipped — several
 * widgets used to end up outside the viewport with no way to scroll to them.
 *
 * Derived from WIDGETS: recompute both constants whenever the layout moves.
 */
const CANVAS_WIDTH = 1382
const CANVAS_HEIGHT = 1090
/** Layout height the container reserves: min-height 800 + 40/100 padding. */
const CANVAS_LAYOUT_HEIGHT = 940

const canvasScale = ref(1)

const canvasStyle = computed(() => {
  if (canvasScale.value === 1) return {}
  return {
    transform: `scale(${canvasScale.value})`,
    // Reclaim the layout space the transform no longer paints into, otherwise
    // the shrunken canvas leaves a gap and the page still scrolls.
    marginBottom: `${-(1 - canvasScale.value) * CANVAS_LAYOUT_HEIGHT}px`,
  }
})

const {
  isSettingsOpen,
  isDragMode,
  draggingId,
  layouts,
  offsets,
  getWidgetStyle,
  updateSize,
  startDrag,
  onDrag,
  endDrag,
  saveOffsets,
  openSettings,
  closeSettings,
  enterDragMode,
  cancelDrag,
} = useLayoutEditor(() => canvasScale.value)

const { toasts } = useToast()

const isMobile = ref(window.innerWidth < 768)

type SocialMotionState = {
  x: number
  y: number
  pull: number
}

type SocialControlBox = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  centerX: number
  centerY: number
}

type SocialConnectionFrame = {
  left: number
  top: number
  width: number
  height: number
}

const socialRow = ref<HTMLElement | null>(null)
const socialTargets = new Map<HTMLElement, SocialMotionState>()
const socialCurrent = new Map<HTMLElement, SocialMotionState>()
const socialConnectionPaths = ref<string[]>([])
const socialConnectionFrame = ref<SocialConnectionFrame>({
  left: 0,
  top: 0,
  width: 1,
  height: 1,
})
let socialFrame: number | null = null
let socialResizeObserver: ResizeObserver | null = null
const socialReducedMotion = ref(
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches,
)
let socialMotionQuery: MediaQueryList | null = null
let socialMotionListener: ((event: MediaQueryListEvent) => void) | null = null

function socialControls(): HTMLElement[] {
  return Array.from(socialRow.value?.querySelectorAll<HTMLElement>('[data-liquid-social]') ?? [])
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function controlBoxes(): SocialControlBox[] {
  const container = socialRow.value
  const controls = socialControls()
  if (!container || controls.length < 2) return []

  const containerRect = container.getBoundingClientRect()
  const scale = container.clientWidth > 0
    ? containerRect.width / container.clientWidth
    : 1
  return controls.map((control) => {
    const rect = control.getBoundingClientRect()
    return {
      left: (rect.left - containerRect.left) / scale,
      top: (rect.top - containerRect.top) / scale,
      right: (rect.right - containerRect.left) / scale,
      bottom: (rect.bottom - containerRect.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
      centerX: (rect.left + rect.width / 2 - containerRect.left) / scale,
      centerY: (rect.top + rect.height / 2 - containerRect.top) / scale,
    }
  })
}

function connectionPairs(boxes: SocialControlBox[]): Array<[SocialControlBox, SocialControlBox]> {
  const pairs = new Map<string, [SocialControlBox, SocialControlBox]>()

  boxes.forEach((box, index) => {
    const right = boxes
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .filter(({ candidate, candidateIndex }) => {
        if (candidateIndex === index || candidate.centerX <= box.centerX) return false
        return Math.abs(candidate.centerY - box.centerY) <= Math.max(box.height, candidate.height) * 0.72
      })
      .sort(({ candidate: a }, { candidate: b }) => a.centerX - b.centerX)[0]

    if (right) {
      const key = [index, boxes.indexOf(right.candidate)].sort().join(':')
      pairs.set(key, [box, right.candidate])
    }

    const below = boxes
      .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
      .filter(({ candidate, candidateIndex }) => {
        if (candidateIndex === index || candidate.centerY <= box.centerY) return false
        return Math.abs(candidate.centerX - box.centerX) <= Math.max(box.width, candidate.width) * 0.72
      })
      .sort(({ candidate: a }, { candidate: b }) => a.centerY - b.centerY)[0]

    if (below) {
      const key = [index, boxes.indexOf(below.candidate)].sort().join(':')
      pairs.set(key, [box, below.candidate])
    }
  })

  return Array.from(pairs.values())
}

function bridgePath(first: SocialControlBox, second: SocialControlBox, frame: SocialConnectionFrame): string {
  const dx = second.centerX - first.centerX
  const dy = second.centerY - first.centerY
  const length = Math.hypot(dx, dy)
  if (length < 1) return ''

  const isHorizontal = Math.abs(dx) >= Math.abs(dy)
  const direction = isHorizontal ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) }
  const perpendicular = { x: -direction.y, y: direction.x }
  const firstRadius = (first.width * Math.abs(direction.x) + first.height * Math.abs(direction.y)) / 2
  const secondRadius = (second.width * Math.abs(direction.x) + second.height * Math.abs(direction.y)) / 2
  const diameter = Math.min(first.width, first.height, second.width, second.height)
  // The bridge is deliberately broad at the two attachment points and narrows
  // only in the middle, so the gap reads as one soft organic silhouette.
  const endpointHalfWidth = diameter * 0.27
  const neckHalfWidth = diameter * 0.19
  const overlap = clamp(diameter * 0.2, 15, 25)
  const start = {
    x: first.centerX + direction.x * (firstRadius - overlap),
    y: first.centerY + direction.y * (firstRadius - overlap),
  }
  const end = {
    x: second.centerX - direction.x * (secondRadius - overlap),
    y: second.centerY - direction.y * (secondRadius - overlap),
  }
  const local = (point: { x: number; y: number }) => ({
    x: point.x - frame.left,
    y: point.y - frame.top,
  })
  const startTop = local({
    x: start.x + perpendicular.x * endpointHalfWidth,
    y: start.y + perpendicular.y * endpointHalfWidth,
  })
  const endTop = local({
    x: end.x + perpendicular.x * endpointHalfWidth,
    y: end.y + perpendicular.y * endpointHalfWidth,
  })
  const endBottom = local({
    x: end.x - perpendicular.x * endpointHalfWidth,
    y: end.y - perpendicular.y * endpointHalfWidth,
  })
  const startBottom = local({
    x: start.x - perpendicular.x * endpointHalfWidth,
    y: start.y - perpendicular.y * endpointHalfWidth,
  })
  const point = (value: { x: number; y: number }) => `${value.x.toFixed(2)} ${value.y.toFixed(2)}`
  const at = (progress: number, offset: number) => ({
    x: start.x + (end.x - start.x) * progress + perpendicular.x * offset - frame.left,
    y: start.y + (end.y - start.y) * progress + perpendicular.y * offset - frame.top,
  })
  const offsetPoint = (center: { x: number; y: number }, along: number, across: number) => point({
    x: center.x + direction.x * along + perpendicular.x * across - frame.left,
    y: center.y + direction.y * along + perpendicular.y * across - frame.top,
  })
  const control = (progress: number, offset: number) => point(at(progress, offset))

  const neckShoulder = neckHalfWidth * 1.06
  const upperBulge = endpointHalfWidth * 0.98
  const lowerBulge = endpointHalfWidth * 0.94
  const capDepth = Math.min(endpointHalfWidth, overlap)

  return [
    `M ${point(startTop)}`,
    `C ${control(0.12, upperBulge)}, ${control(0.2, neckShoulder)}, ${control(0.34, neckHalfWidth)}`,
    `C ${control(0.42, neckHalfWidth * 0.92)}, ${control(0.58, neckHalfWidth * 0.92)}, ${control(0.66, neckHalfWidth)}`,
    `C ${control(0.8, neckShoulder)}, ${control(0.88, upperBulge)}, ${point(endTop)}`,
    // These two caps reach the card edges while the centerline endpoint stays
    // inside each sphere, hiding the original circular seam at the join.
    `C ${offsetPoint(end, -capDepth, endpointHalfWidth)}, ${offsetPoint(end, -capDepth, -endpointHalfWidth)}, ${point(endBottom)}`,
    `C ${control(0.88, -lowerBulge)}, ${control(0.8, -neckShoulder)}, ${control(0.66, -neckHalfWidth)}`,
    `C ${control(0.58, -neckHalfWidth * 0.92)}, ${control(0.42, -neckHalfWidth * 0.92)}, ${control(0.34, -neckHalfWidth)}`,
    `C ${control(0.2, -neckShoulder)}, ${control(0.12, -lowerBulge)}, ${point(startBottom)}`,
    `C ${offsetPoint(start, capDepth, -endpointHalfWidth)}, ${offsetPoint(start, capDepth, endpointHalfWidth)}, ${point(startTop)} Z`,
  ].join(' ')
}

function updateSocialConnectionPath() {
  const boxes = controlBoxes()
  if (boxes.length < 2) {
    socialConnectionPaths.value = []
    return
  }

  const frame = {
    left: Math.min(...boxes.map((box) => box.left)),
    top: Math.min(...boxes.map((box) => box.top)),
    width: Math.max(...boxes.map((box) => box.right)) - Math.min(...boxes.map((box) => box.left)),
    height: Math.max(...boxes.map((box) => box.bottom)) - Math.min(...boxes.map((box) => box.top)),
  }
  const paths = connectionPairs(boxes)
    .map(([first, second]) => bridgePath(first, second, frame))
    .filter(Boolean)

  socialConnectionFrame.value = frame
  socialConnectionPaths.value = paths
}

function animateSocialMotion() {
  socialFrame = null
  let isSettled = true

  for (const control of socialControls()) {
    const target = socialTargets.get(control) ?? { x: 0, y: 0, pull: 0 }
    const current = socialCurrent.get(control) ?? { x: 0, y: 0, pull: 0 }

    current.x += (target.x - current.x) * 0.18
    current.y += (target.y - current.y) * 0.18
    current.pull += (target.pull - current.pull) * 0.18

    const settled =
      Math.abs(target.x - current.x) <= 0.01 &&
      Math.abs(target.y - current.y) <= 0.01 &&
      Math.abs(target.pull - current.pull) <= 0.01
    if (settled) {
      current.x = target.x
      current.y = target.y
      current.pull = target.pull
    }

    socialCurrent.set(control, current)

    control.style.setProperty('--liquid-x', `${current.x.toFixed(3)}px`)
    control.style.setProperty('--liquid-y', `${current.y.toFixed(3)}px`)
    control.style.setProperty('--liquid-pull', current.pull.toFixed(3))

    if (!settled) {
      isSettled = false
    }
  }

  updateSocialConnectionPath()

  if (!isSettled) {
    socialFrame = requestAnimationFrame(animateSocialMotion)
  }
}

function scheduleSocialMotion() {
  if (socialReducedMotion.value) return
  if (socialFrame === null) {
    socialFrame = requestAnimationFrame(animateSocialMotion)
  }
}

function onSocialPointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch' || socialReducedMotion.value) return

  for (const control of socialControls()) {
    const rect = control.getBoundingClientRect()
    const deltaX = event.clientX - (rect.left + rect.width / 2)
    const deltaY = event.clientY - (rect.top + rect.height / 2)
    const distance = Math.hypot(deltaX, deltaY)
    const influenceRadius = Math.max(rect.width * 2.8, 180)
    const pull = clamp(1 - distance / influenceRadius, 0, 1)

    socialTargets.set(control, {
      x: clamp(deltaX * 0.06 * pull, -5, 5),
      y: clamp(deltaY * 0.06 * pull, -5, 5),
      pull,
    })
  }

  scheduleSocialMotion()
}

function onSocialPointerLeave() {
  if (socialReducedMotion.value) return
  for (const control of socialControls()) {
    socialTargets.set(control, { x: 0, y: 0, pull: 0 })
  }

  scheduleSocialMotion()
}

function onResize() {
  isMobile.value = window.innerWidth < 768
  // Below the mobile breakpoint the canvas gives way to a flex column, which
  // reflows on its own and must not be scaled.
  canvasScale.value = isMobile.value
    ? 1
    : Math.min(1, window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT)
}
onResize()
window.addEventListener('resize', onResize)

// Saved offsets and size edits update absolute positions without necessarily
// changing the observed container size, so recalculate the local bridge frame
// after Vue applies those layout changes.
watch([offsets, layouts], () => {
  void nextTick(updateSocialConnectionPath)
})

onMounted(() => {
  if (typeof window.matchMedia === 'function') {
    socialMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      socialReducedMotion.value = event.matches
      if (event.matches) {
        if (socialFrame !== null) cancelAnimationFrame(socialFrame)
        socialFrame = null
        for (const control of socialControls()) {
          socialTargets.set(control, { x: 0, y: 0, pull: 0 })
          socialCurrent.set(control, { x: 0, y: 0, pull: 0 })
          control.style.setProperty('--liquid-x', '0px')
          control.style.setProperty('--liquid-y', '0px')
          control.style.setProperty('--liquid-pull', '0')
        }
        updateSocialConnectionPath()
      }
    }
    socialMotionListener = onMotionPreferenceChange
    socialMotionQuery.addEventListener?.('change', socialMotionListener)
  }

  nextTick(() => {
    updateSocialConnectionPath()
    const container = socialRow.value
    if (!container || typeof ResizeObserver === 'undefined') return

    socialResizeObserver = new ResizeObserver(updateSocialConnectionPath)
    socialResizeObserver.observe(container)
    for (const control of socialControls()) {
      socialResizeObserver.observe(control)
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  socialResizeObserver?.disconnect()
  if (socialMotionQuery && socialMotionListener) socialMotionQuery.removeEventListener?.('change', socialMotionListener)
  if (socialFrame !== null) {
    cancelAnimationFrame(socialFrame)
  }
})

/** Compute drag handle inline style from widget base + offset */
function dragHandleStyle(w: WidgetLayout): Record<string, string> {
  const off = offsets.value[w.id]
  return {
    left: `${w.left + (off?.x ?? 0)}px`,
    top: `${w.top + (off?.y ?? 0)}px`,
    width: `${w.width}px`,
    height: `${w.height}px`,
  }
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  // Transparent so GradientWaves shows through; the static gradient on <html>
  // stays as the base layer and the reduced-motion fallback.
  background: transparent;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: auto;

  &::before,
  &::after {
    content: '';
    flex: 1;
    min-height: 0;
    pointer-events: none;
  }

  &::before {
    flex: 0.42;
  }

  &__container {
    position: relative;
    width: 1100px;
    flex-shrink: 0;
    margin: 0 auto;
    padding: 40px 0 100px;
    min-height: 800px;
    // Scale factor comes from JS (see canvasStyle); anchoring at the top keeps
    // the canvas from drifting upward as it shrinks.
    transform-origin: top center;
  }

  &__cell {
    position: absolute;
    z-index: 2;
  }

  &__social-connection {
    position: absolute;
    // Sit over the card seams so the shared fill visually fuses into each
    // sphere; pointer-events remain disabled and the icon centers stay clear.
    z-index: 3;
    pointer-events: none;
  }

  &__social-connection-bridge {
    // Use the existing hover-glass token for a visible but still transparent
    // local join; the page background remains visible through the shape.
    fill: $bg-card-hover;
    pointer-events: none;
  }

  :deep(.home-social-control) {
    --liquid-x: 0px;
    --liquid-y: 0px;
    --liquid-pull: 0;
    transform: translate3d(var(--liquid-x), var(--liquid-y), 0)
      rotate(calc(var(--liquid-pull) * 2deg));
    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
                color 0.3s ease,
                opacity 0.3s ease,
                box-shadow 0.3s ease;
    will-change: transform;
  }

  // Settings gear button (fixed position, always visible)
  &__settings-btn {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 290;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(10px);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.65),
      inset 0 0 8px 2px rgba(255, 255, 255, 0.12);
    color: $text-secondary;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background $transition-fast,
                box-shadow $transition-fast,
                color $transition-fast,
                transform $transition-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.6);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.8),
        inset 0 0 12px 3px rgba(255, 255, 255, 0.2);
      color: $text-primary;
    }

    @media (hover: hover) and (pointer: fine) {
      &:hover {
        transform: rotate(30deg);
      }
    }
  }

  // Drag overlay — prevents interaction with widgets
  &__drag-overlay {
    position: fixed;
    inset: 0;
    z-index: $z-drag-overlay;
    background: rgba(0, 0, 0, 0.06);
  }

  // Drag handles — transparent grab zones on top of each widget
  &__drag-handle {
    position: absolute;
    z-index: calc($z-drag-overlay + 1);
    cursor: grab;
    border: 2px dashed rgba(126, 200, 227, 0.4);
    border-radius: $radius-xl;
    transition: border-color 0.2s ease, background 0.2s ease;

    &:hover {
      border-color: $accent-primary;
      background: rgba(126, 200, 227, 0.06);
    }

    &--active {
      border-color: $accent-primary;
      background: rgba(126, 200, 227, 0.1);
      cursor: grabbing;
    }
  }

  // Drag mode action buttons
  &__drag-actions {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: calc($z-drag-overlay + 2);
    display: flex;
    gap: $spacing-md;
  }


  &__drag-btn {
    padding: 12px 32px;
    border: none;
    border-radius: $radius-md;
    font-size: $font-size-base;
    font-weight: 600;
    cursor: pointer;
    transition: background $transition-fast,
                opacity $transition-fast,
                transform $transition-fast;

    &--save {
      background: $accent-gradient;
      color: white;

      &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
    }

    &--cancel {
      background: rgba(255, 255, 255, 0.6);
      color: $text-primary;
      backdrop-filter: blur(8px);

      &:hover {
        background: rgba(255, 255, 255, 0.8);
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-page :deep(.home-social-control) {
    transform: none !important;
    transition: none !important;
    will-change: auto;
  }

  .home-page__social-connection-bridge {
    fill: $bg-card-hover;
  }
}

// Mobile: switch from absolute canvas to flex column
@media (max-width: $breakpoint-md) {
  .home-page {
    overflow-x: hidden;

    &::before {
      flex: 0;
    }

    &__container {
      width: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px 16px 80px;
      min-height: auto;
    }

    &__cell {
      position: static !important;
      left: auto !important;
      top: auto !important;
      width: auto !important;
      height: auto !important;
    }

    &__icon-row {
      display: flex;
      flex-direction: row;
      gap: 12px;
      justify-content: center;

      .home-page__cell {
        flex: 1;
        min-width: 0;
        max-width: 100px;
      }
    }

    [data-widget="music"] {
      min-height: 160px;
    }

    &__nav-cell :deep(.nav-menu) {
      flex-direction: row;
      padding: 6px;
      gap: 4px;
    }

    &__nav-cell :deep(.nav-menu__item) {
      flex: 1;
      padding: 12px 4px;
      border-radius: 14px;
      justify-content: center;
      flex-direction: column;
      gap: 4px;
    }

    &__nav-cell :deep(.nav-menu__label) {
      font-size: 13px;
    }
  }
}
</style>
