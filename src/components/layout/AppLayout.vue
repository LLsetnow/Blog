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
          <router-link to="/about" class="app-layout__nav-item">关于</router-link>
        </nav>
      </div>
    </header>

    <main class="app-layout__main">
      <slot />
    </main>

    <footer class="app-layout__footer">
      <p>&copy; {{ currentYear }} Akai's Blog. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
const currentYear: number = new Date().getFullYear()
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: $bg-gradient;
  background-attachment: fixed;

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
    padding: $spacing-xl $spacing-lg;
  }

  &__footer {
    text-align: center;
    padding: $spacing-lg;
    color: $text-muted;
    font-size: $font-size-sm;
  }
}
</style>
