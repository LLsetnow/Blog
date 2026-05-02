<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast-container__item"
        >
          {{ t.text }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ToastMessage } from '@/composables/useToast'

defineProps<{
  toasts: ToastMessage[]
}>()
</script>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 500;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;

  &__item {
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    color: #fff;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    white-space: nowrap;
  }
}

.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
