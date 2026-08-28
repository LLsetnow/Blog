<template>
  <div class="app-layout">
    <header class="app-layout__header">
      <div class="app-layout__container">
        <router-link to="/" class="app-layout__logo">
          <span class="app-layout__logo-text">Akai's Blog</span>
        </router-link>

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
const currentYear: number = new Date().getFullYear()
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

}

@media (max-width: $breakpoint-md) {
  .app-layout {
    &__container {
      padding: $spacing-sm $spacing-md;
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
