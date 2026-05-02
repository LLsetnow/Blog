<template>
  <AppLayout>
    <div class="favorites">
      <h1 class="favorites__title">收藏</h1>

      <div class="favorites__empty glass-card">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        <p class="favorites__empty-text">暂无收藏</p>
        <p class="favorites__empty-hint">收藏的功能即将上线，敬请期待</p>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
</script>

<style lang="scss" scoped>
.favorites {
  max-width: 600px;
  margin: 0 auto;

  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    margin-bottom: $spacing-xl;
  }

  &__empty {
    @include glass-card;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $spacing-3xl;
    gap: $spacing-md;
    color: $text-muted;
  }

  &__empty-text {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-secondary;
    margin: 0;
  }

  &__empty-hint {
    font-size: $font-size-sm;
    color: $text-muted;
    margin: 0;
  }
}
</style>
