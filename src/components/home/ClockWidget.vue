<template>
  <div class="clock-widget glass-card">
    <div class="clock-widget__face">
      <!-- Hour marks: numbers at 12/3/6/9, ticks at others -->
      <div
        v-for="mark in marks"
        :key="mark.value"
        class="clock-widget__mark"
        :style="{ transform: 'rotate(' + mark.angle + 'deg)' }"
      >
        <span
          v-if="mark.isNumber"
          class="clock-widget__number"
          :style="{ transform: 'translateX(-50%) rotate(' + (-mark.angle) + 'deg)' }"
        >{{ mark.value }}</span>
        <span v-else class="clock-widget__tick"
              :style="{ transform: 'translateX(-50%)' }" />
      </div>

      <!-- Hands -->
      <div
        class="clock-widget__hand clock-widget__hand--hour"
        :style="{ transform: 'translateX(-50%) rotate(' + hourDeg + 'deg)' }"
      />
      <div
        class="clock-widget__hand clock-widget__hand--minute"
        :style="{ transform: 'translateX(-50%) rotate(' + minuteDeg + 'deg)' }"
      />
      <div
        class="clock-widget__hand clock-widget__hand--second"
        :style="{ transform: 'translateX(-50%) rotate(' + secondDeg + 'deg)' }"
      />

      <!-- Center dot -->
      <div class="clock-widget__center" />
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

interface Mark {
  value: number
  angle: number
  isNumber: boolean
}

const marks = computed<Mark[]>(() => {
  return Array.from({ length: 12 }, (_, i) => {
    const value = i === 0 ? 12 : i
    const isNumber = [0, 3, 6, 9].includes(i)
    return {
      value,
      angle: i * 30,
      isNumber,
    }
  })
})

const hourDeg = computed<number>(() => {
  const h = now.value.getHours() % 12
  const m = now.value.getMinutes()
  const s = now.value.getSeconds()
  return (h + m / 60 + s / 3600) * 30
})

const minuteDeg = computed<number>(() => {
  const m = now.value.getMinutes()
  const s = now.value.getSeconds()
  return (m + s / 60) * 6
})

const secondDeg = computed<number>(() => {
  return now.value.getSeconds() * 6
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
  flex-shrink: 0;
  align-self: flex-start;
  border-radius: 50%;
  padding: 12px;

  &__face {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    border: none;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  &__mark {
    position: absolute;
    top: 0;
    left: 50%;
    width: 0;
    height: 50%;
    transform-origin: bottom center;
  }

  &__number {
    position: absolute;
    top: 10px;
    left: 50%;
    font-size: 14px;
    font-weight: 600;
    color: $text-primary;
    line-height: 1;
  }

  &__tick {
    position: absolute;
    top: 12px;
    left: 50%;
    width: 2px;
    height: 8px;
    background: $text-secondary;
    border-radius: 1px;
  }

  &__hand {
    position: absolute;
    bottom: 50%;
    left: 50%;
    transform-origin: bottom center;
    border-radius: 4px;

    &--hour {
      width: 5px;
      height: 30%;
      background: $text-primary;
      z-index: 1;
    }

    &--minute {
      width: 3px;
      height: 40%;
      background: $text-primary;
      z-index: 1;
    }

    &--second {
      width: 1.5px;
      height: 45%;
      background: #e74c3c;
      z-index: 1;
    }
  }

  &__center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $text-primary;
    z-index: 2;
  }
}
</style>
