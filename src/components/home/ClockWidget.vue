<template>
  <div class="clock-widget glass-card">
    <div class="clock-widget__face">
      <div class="clock-widget__time">{{ timeStr }}</div>
      <div class="clock-widget__date">{{ dateStr }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const now = ref(new Date())

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const timeStr = computed<string>(() => {
  const h = String(now.value.getHours()).padStart(2, '0')
  const m = String(now.value.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
})

const dateStr = computed<string>(() => {
  return now.value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})
</script>

<style lang="scss" scoped>
.clock-widget {
  @include glass-card;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  padding: 0;

  &__face {
    text-align: center;
  }

  &__time {
    font-size: 36px;
    font-weight: 700;
    font-family: $font-mono;
    color: $text-primary;
    line-height: 1.2;
    letter-spacing: 2px;
  }

  &__date {
    margin-top: $spacing-xs;
    color: $text-secondary;
    font-size: $font-size-sm;
    font-family: $font-mono;
  }
}
</style>
