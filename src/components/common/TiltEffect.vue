<template>
  <div
    ref="tiltRef"
    class="tilt-effect"
    :class="{ 'tilt-effect--disabled': disabled }"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface TiltEffectProps {
  maxTilt?: number
  scale?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<TiltEffectProps>(), {
  maxTilt: 8,
  scale: 1.03,
  disabled: false,
})

const tiltRef = ref<HTMLElement | null>(null)

function onMouseMove(event: MouseEvent): void {
  if (props.disabled) return
  const element = tiltRef.value
  if (!element) return

  const rect = element.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const deltaX = (event.clientX - centerX) / rect.width
  const deltaY = (event.clientY - centerY) / rect.height

  const tiltX = deltaY * -props.maxTilt
  const tiltY = deltaX * props.maxTilt

  element.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
}

function onMouseLeave(): void {
  if (props.disabled) return
  const element = tiltRef.value
  if (!element) return
  element.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'
}
</script>

<style lang="scss" scoped>
.tilt-effect {
  width: 100%;
  height: 100%;
  flex-shrink: 0;
  transition: transform 0.5s ease;

  &--disabled {
    transform: none !important;
    transition: none !important;
  }
}
</style>
