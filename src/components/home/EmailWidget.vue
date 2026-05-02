<template>
  <div class="email-widget glass-card" :class="{ 'email-widget--copied': copied }" @click="copy">
    <svg class="email-widget__icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@/composables/useToast'

const emit = defineEmits<{
  copied: [text: string]
}>()

const copied = ref(false)
const { show } = useToast()

async function copy() {
  const text = '70004500@qq.com'
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    emit('copied', text)
    show('已复制邮箱地址')
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    emit('copied', text)
    show('已复制邮箱地址')
    setTimeout(() => { copied.value = false }, 1500)
  }
}
</script>

<style lang="scss" scoped>
.email-widget {
  @include glass-card;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  width: 100%;
  height: 100%;
  cursor: pointer;
  text-decoration: none;
  color: $text-primary;
  transition: all 0.3s ease;
  padding: $spacing-md;

  &:hover {
    color: #7ec8e3;
  }

  &--copied {
    color: #7ec8e3;
  }

  &__icon {
    flex-shrink: 0;
    color: inherit;
  }
}
</style>
