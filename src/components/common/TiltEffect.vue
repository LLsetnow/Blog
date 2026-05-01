<template>
  <div
    ref="tiltRef"
    class="tilt-effect"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface TiltEffectProps {
  maxTilt?: number
  scale?: number
}

const props = withDefaults(defineProps<TiltEffectProps>(), {
  maxTilt: 8,
  scale: 1.03,
})

const tiltRef = ref<HTMLElement | null>(null)

function handleMouseMove(event: MouseEvent): void {
  const element = tiltRef.value
  if (!element) return

  // Remove transition during active tilt for responsiveness
  element.style.transition = 'transform 0.1s ease-out'

  const rect = element.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const deltaX = (event.clientX - centerX) / rect.width
  const deltaY = (event.clientY - centerY) / rect.height

  const tiltX = deltaY * -props.maxTilt
  const tiltY = deltaX * props.maxTilt

  element.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${props.scale}, ${props.scale}, ${props.scale})`
}

function handleMouseLeave(): void {
  const element = tiltRef.value
  if (!element) return
  // Smooth return to original state
  element.style.transition = 'transform 0.5s ease'
  element.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
}
</script>

<style lang="scss" scoped>
.tilt-effect {
  transition: transform 0.5s ease;
  transform-style: preserve-3d;
  will-change: transform;
}
</style>
