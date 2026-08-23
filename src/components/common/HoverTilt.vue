<template>
  <div
    ref="tiltElement"
    class="hover-tilt"
    :class="{ 'hover-tilt--tracking': isTracking }"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="stopTracking"
    @pointercancel="stopTracking"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineOptions({ name: 'HoverTilt' })

const props = withDefaults(defineProps<{
  maxTilt?: number
  scale?: number
}>(), {
  maxTilt: 4,
  scale: 1.015,
})

const tiltElement = ref<HTMLElement | null>(null)
const isTracking = ref(false)

let fineHoverQuery: MediaQueryList | null = null
let reducedMotionQuery: MediaQueryList | null = null
let canTilt = false
let rect: DOMRect | null = null
let frameId: number | null = null
let latestPointer: { x: number; y: number } | null = null

function cancelFrame() {
  if (frameId !== null) {
    cancelAnimationFrame(frameId)
    frameId = null
  }
}

function resetTransform() {
  const element = tiltElement.value
  if (element) element.style.transform = ''
}

function stopTracking() {
  cancelFrame()
  rect = null
  latestPointer = null
  isTracking.value = false
  resetTransform()
}

function updateCapabilities() {
  canTilt = Boolean(fineHoverQuery?.matches) && !reducedMotionQuery?.matches
  stopTracking()
}

function onPointerEnter(event: PointerEvent) {
  if (!canTilt || event.pointerType !== 'mouse') return

  const element = tiltElement.value
  if (!element) return

  rect = element.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    rect = null
    return
  }

  isTracking.value = true
  latestPointer = { x: event.clientX, y: event.clientY }
}

function onPointerMove(event: PointerEvent) {
  if (!canTilt || !isTracking.value || !rect || event.pointerType !== 'mouse') return

  latestPointer = { x: event.clientX, y: event.clientY }
  if (frameId !== null) return

  frameId = requestAnimationFrame(() => {
    frameId = null

    const element = tiltElement.value
    const currentRect = rect
    const pointer = latestPointer
    if (!element || !isTracking.value || !currentRect || !pointer) return

    const pointerX = Math.min(1, Math.max(0, (pointer.x - currentRect.left) / currentRect.width))
    const pointerY = Math.min(1, Math.max(0, (pointer.y - currentRect.top) / currentRect.height))
    const rotateX = (0.5 - pointerY) * props.maxTilt * 2
    const rotateY = (pointerX - 0.5) * props.maxTilt * 2

    element.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${props.scale}, ${props.scale}, ${props.scale})`
  })
}

onMounted(() => {
  fineHoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

  fineHoverQuery.addEventListener('change', updateCapabilities)
  reducedMotionQuery.addEventListener('change', updateCapabilities)
  updateCapabilities()
})

onBeforeUnmount(() => {
  fineHoverQuery?.removeEventListener('change', updateCapabilities)
  reducedMotionQuery?.removeEventListener('change', updateCapabilities)
  stopTracking()
})
</script>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  .hover-tilt {
    transform-style: preserve-3d;
    transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  .hover-tilt--tracking {
    will-change: transform;
    transition: transform 50ms linear;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hover-tilt {
    transition: none;
  }
}
</style>
