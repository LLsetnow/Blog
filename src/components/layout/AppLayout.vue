<template>
  <div class="app-layout">
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
  background: transparent;

  &__main {
    box-sizing: border-box;
    flex: 1;
    width: 100%;
    max-width: 1376px;
    margin: 0 auto;
    padding: 88px 176px 100px $spacing-lg;
  }

  &__footer {
    box-sizing: border-box;
    padding: $spacing-lg 176px $spacing-lg $spacing-lg;
    color: $text-muted;
    font-size: $font-size-sm;
    text-align: center;
  }

  &__beian {
    margin-top: $spacing-sm;
    color: #666;
    font-size: 12px;

    a {
      color: #666;
      text-decoration: none;

      &:hover {
        color: $text-primary;
      }

      &:focus-visible {
        border-radius: 3px;
        outline: 2px solid #167d9c;
        outline-offset: 3px;
      }
    }

    span {
      margin: 0 5px;
    }

    &-icon {
      width: 16px;
      height: 16px;
      margin-right: 2px;
      vertical-align: -3px;
    }
  }
}

@media (max-width: 767px) {
  .app-layout {
    box-sizing: border-box;
    padding-bottom: 96px;

    &__main {
      max-width: 1200px;
      padding: 76px $spacing-md $spacing-lg;
    }

    &__footer {
      padding: $spacing-md;
      font-size: $font-size-xs;
    }
  }
}
</style>
