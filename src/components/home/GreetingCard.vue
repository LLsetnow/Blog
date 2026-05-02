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
  height: 100%;

  &__avatar {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: none;
    box-shadow:
      inset 0 0 0 2px rgba(255, 255, 255, 0.6),
      0 4px 12px rgba(0, 0, 0, 0.08);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__text {
    flex: 1;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  &__greeting {
    font-size: $font-size-3xl;
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
