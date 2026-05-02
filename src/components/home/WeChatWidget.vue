<template>
  <div class="wechat-widget glass-card" :class="{ 'wechat-widget--copied': copied }" @click="copy">
    <img :src="`${baseUrl}assets/微信.svg`" alt="微信" class="wechat-widget__icon" width="36" height="36" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@/composables/useToast'

const baseUrl = import.meta.env.BASE_URL || '/'

const emit = defineEmits<{
  copied: [text: string]
}>()

const copied = ref(false)
const { show } = useToast()

async function copy() {
  const text = 'f70004500'
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    emit('copied', text)
    show('已复制微信号')
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
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
    show('已复制微信号')
    setTimeout(() => { copied.value = false }, 1500)
  }
}
</script>

<style lang="scss" scoped>
.wechat-widget {
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
  color: #07c160;
  transition: all 0.3s ease;
  padding: $spacing-md;

  &:hover {
    color: #06ad56;
    opacity: 0.85;
  }

  &--copied {
    opacity: 0.7;
  }

  &__icon {
    flex-shrink: 0;
    color: inherit;
  }
}
</style>
