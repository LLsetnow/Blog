<template>
  <div class="greeting-card glass-card">
    <div class="greeting-card__avatar">
      <img :src="avatarSrc" alt="avatar" />
    </div>
    <div class="greeting-card__text">
      <h1 class="greeting-card__greeting">Hi, I'm Akai</h1>
      <p class="greeting-card__subtitle">欢迎来到我的个人空间</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import avatarSrc from '@/assets/avatar.jpg'
</script>

<style lang="scss" scoped>
.greeting-card {
  @include glass-card;
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  width: 100%;

  &__avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__text {
    flex: 1;
  }

  &__greeting {
    font-size: $font-size-2xl;
    font-weight: 700;
    margin-bottom: $spacing-xs;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__subtitle {
    color: $text-secondary;
    font-size: $font-size-sm;
  }
}
</style>
