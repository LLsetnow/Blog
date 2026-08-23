<template>
  <div class="app-layout">
    <header class="app-layout__header">
      <div class="app-layout__container">
        <router-link to="/" class="app-layout__logo">
          <span class="app-layout__logo-text">Akai's Blog</span>
        </router-link>

        <nav class="app-layout__nav">
          <router-link to="/" class="app-layout__nav-item">首页</router-link>
          <router-link to="/blog" class="app-layout__nav-item">博客</router-link>
          <router-link to="/projects" class="app-layout__nav-item">项目</router-link>
          <router-link to="/news" class="app-layout__nav-item">新闻</router-link>
          <router-link to="/about" class="app-layout__nav-item">关于</router-link>
          <router-link to="/favorites" class="app-layout__nav-item">收藏</router-link>
        </nav>

        <!-- Mobile nav capsule -->
        <div class="app-layout__mobile-nav">
          <button
            class="app-layout__nav-pill"
            :class="{ 'app-layout__nav-pill--open': menuOpen }"
            @click.stop="menuOpen = !menuOpen"
            :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
          >
            <span class="app-layout__nav-pill-avatar">A</span>
            <span class="app-layout__nav-pill-icon">
              <svg v-if="!menuOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </span>
          </button>
          <nav v-show="menuOpen" class="app-layout__nav-dropdown">
            <router-link to="/" class="app-layout__nav-dropdown-item">首页</router-link>
            <router-link to="/blog" class="app-layout__nav-dropdown-item">博客</router-link>
            <router-link to="/projects" class="app-layout__nav-dropdown-item">项目</router-link>
            <router-link to="/news" class="app-layout__nav-dropdown-item">新闻</router-link>
            <router-link to="/about" class="app-layout__nav-dropdown-item">关于</router-link>
            <router-link to="/favorites" class="app-layout__nav-dropdown-item">收藏</router-link>
          </nav>
        </div>
      </div>
    </header>

    <main class="app-layout__main">
      <slot />
    </main>

    <footer class="app-layout__footer">
      <p>&copy; {{ currentYear }} Akai's Blog. All rights reserved.</p>
      <div class="app-layout__beian">
        <a href="https://beian.miit.gov.cn/#/Integrated/recordQuery?keyword=%E6%B5%99ICP%E5%A4%872026031312%E5%8F%B7-1" target="_blank" rel="noopener noreferrer">
          浙ICP备2026031312号-1
        </a>
        <span>|</span>
        <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33019202002996" target="_blank" rel="noopener noreferrer">
          <img src="/assets/备案图标.png" class="app-layout__beian-icon" alt="公安备案" />
          浙公网安备33019202002996号
        </a>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentYear: number = new Date().getFullYear()
const menuOpen = ref<boolean>(false)

watch(() => route.path, () => {
  menuOpen.value = false
})
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  // Transparent so FluidBackground shows through; the static gradient on <html>
  // stays as the base layer and the reduced-motion fallback.
  background: transparent;

  &__header {
    position: sticky;
    top: 0;
    z-index: $z-sticky;
    @include glass;
    border-top: none;
    border-left: none;
    border-right: none;
    border-radius: 0;
  }

  &__container {
    max-width: 1200px;
    margin: 0 auto;
    padding: $spacing-md $spacing-lg;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    text-decoration: none;
    color: $text-primary;
  }

  &__logo-text {
    font-size: $font-size-lg;
    font-weight: 700;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__nav {
    display: flex;
    gap: $spacing-lg;
  }

  &__nav-item {
    color: $text-secondary;
    text-decoration: none;
    font-size: $font-size-sm;
    font-weight: 500;
    transition: color $transition-fast;
    position: relative;

    &:hover,
    &.router-link-active {
      color: $text-primary;
    }

    &.router-link-active::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      right: 0;
      height: 2px;
      background: $accent-primary;
      border-radius: 1px;
    }
  }

  &__main {
    flex: 1;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    padding: $spacing-xl $spacing-lg 100px;
  }

  &__footer {
    text-align: center;
    padding: $spacing-lg;
    color: $text-muted;
    font-size: $font-size-sm;
  }

  &__beian {
    margin-top: $spacing-sm;
    font-size: 12px;
    color: #666;

    a {
      color: #666;
      text-decoration: none;

      &:hover {
        color: $text-primary;
      }
    }

    span {
      margin: 0 5px;
    }

    &-icon {
      width: 16px;
      height: 16px;
      vertical-align: -3px;
      margin-right: 2px;
    }
  }

  // Mobile nav capsule
  &__mobile-nav {
    display: none;
    position: relative;
  }

  &__nav-pill {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px 10px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.5),
      inset 0 0 8px 2px rgba(255, 255, 255, 0.1);
    cursor: pointer;

    &-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: $accent-gradient;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
      margin-right: 4px;
    }

    &-icon {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: $text-secondary;
      transition: color 0.2s;

      &:hover {
        color: $accent-primary;
      }
    }
  }

  &__nav-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 160px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 16px;
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.12),
      0 1px 4px rgba(0, 0, 0, 0.06);
    padding: 6px;
    z-index: $z-dropdown;
  }

  &__nav-dropdown-item {
    display: flex;
    align-items: center;
    padding: 12px 14px;
    text-decoration: none;
    color: $text-secondary;
    font-size: 15px;
    font-weight: 500;
    border-radius: 12px;
    transition: background $transition-fast, color $transition-fast;
    white-space: nowrap;

    &:active {
      background: rgba($accent-primary, 0.2);
      color: $text-primary;
    }

    &.router-link-active {
      color: $text-primary;
      background: rgba($accent-primary, 0.15);
    }
  }
}

@media (max-width: $breakpoint-md) {
  .app-layout {
    &__container {
      padding: $spacing-sm $spacing-md;
    }

    &__nav {
      display: none;
    }

    &__mobile-nav {
      display: block;
    }

    &__main {
      padding: $spacing-md $spacing-md 60px;
    }

    &__footer {
      padding: $spacing-md;
      font-size: $font-size-xs;
    }
  }
}
</style>
