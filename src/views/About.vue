<template>
  <AppLayout>
    <div class="about">
      <h1 class="about__title">关于</h1>

      <div class="about__content glass-card">
        <div class="about__avatar-wrapper">
          <img :src="avatarSrc" alt="avatar" class="about__avatar" />
        </div>

        <h2 class="about__name">LLsetnow</h2>
        <p class="about__handle">@LLsetnow</p>
        <p class="about__description">
          热爱技术，喜欢探索新事物。这个博客使用 Vue 3 + TypeScript 构建，采用毛玻璃设计风格。
        </p>

        <div class="about__info">
          <div class="about__info-item">
            <span class="about__info-label">兴趣</span>
            <span class="about__info-value">Web 开发, 开源, 技术写作, AI</span>
          </div>
        </div>

        <div class="about__skills">
          <h3 class="about__skills-title">技能</h3>
          <div class="about__skills-tags">
            <span
              v-for="skill in skills"
              :key="skill"
              class="about__skills-tag"
            >
              {{ skill }}
            </span>
          </div>
        </div>

        <div class="about__links">
          <a
            href="https://github.com/LLsetnow"
            target="_blank"
            rel="noopener noreferrer"
            class="about__link"
          >
            GitHub
          </a>
          <span class="about__link-placeholder">更多链接即将上线...</span>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import avatarSrc from '@/assets/avatar.jpg'

const skills: string[] = [
  'Vue 3',
  'React',
  'TypeScript',
  'Python',
  'Node.js',
  'SCSS',
  'Git',
  'ComfyUI',
]
</script>

<style lang="scss" scoped>
.about {
  max-width: 600px;
  margin: 0 auto;

  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    margin-bottom: $spacing-xl;
  }

  &__content {
    @include glass-card;
    text-align: center;
  }

  &__avatar-wrapper {
    width: 120px;
    height: 120px;
    margin: 0 auto $spacing-lg;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid $accent-primary;
  }

  &__avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__name {
    font-size: $font-size-xl;
    font-weight: 700;
    margin-bottom: $spacing-xs;
    color: $text-primary;
  }

  &__handle {
    color: $text-muted;
    font-size: $font-size-sm;
    margin-bottom: $spacing-md;
  }

  &__description {
    color: $text-secondary;
    line-height: 1.6;
    margin-bottom: $spacing-xl;
  }

  &__info {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    margin-bottom: $spacing-xl;
  }

  &__info-item {
    display: flex;
    gap: $spacing-md;
  }

  &__info-label {
    min-width: 60px;
    color: $text-muted;
    font-size: $font-size-sm;
    font-weight: 500;
  }

  &__info-value {
    color: $text-secondary;
    font-size: $font-size-sm;
  }

  &__skills {
    text-align: left;
    margin-bottom: $spacing-xl;
  }

  &__skills-title {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-muted;
    margin-bottom: $spacing-sm;
  }

  &__skills-tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
  }

  &__skills-tag {
    padding: 4px 12px;
    border-radius: $radius-md;
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid $glass-border;
    color: $text-secondary;
    font-size: $font-size-sm;
  }

  &__links {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
  }

  &__link {
    display: inline-block;
    padding: $spacing-sm $spacing-lg;
    border-radius: $radius-md;
    background: $accent-gradient;
    color: #fff;
    font-size: $font-size-sm;
    font-weight: 600;
    text-decoration: none;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 0.85;
    }
  }

  &__link-placeholder {
    color: $text-muted;
    font-size: $font-size-xs;
  }
}
</style>
