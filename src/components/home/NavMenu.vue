<template>
  <nav class="nav-menu glass-card" :class="`nav-menu--${variant}`" aria-label="主要导航">
    <router-link
      v-if="variant === 'page'"
      to="/"
      class="nav-menu__item"
      exact-active-class="router-link-exact-active"
      @click.prevent="onNavigate('/')"
    >
      <span class="nav-menu__icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/></svg>
      </span>
      <span class="nav-menu__label">首页</span>
    </router-link>
    <router-link
      v-for="item in menuItems"
      :key="item.path"
      :to="item.path"
      class="nav-menu__item"
      @click.prevent="onNavigate(item.path)"
    >
      <span class="nav-menu__icon" v-html="item.icon" aria-hidden="true" />
      <span class="nav-menu__label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
interface MenuItem {
  path: string
  label: string
  icon: string
}

interface Props {
  variant: 'home' | 'page'
  onNavigate: (path: string) => void
}

defineProps<Props>()

const menuItems: MenuItem[] = [
  {
    path: '/blog',
    label: '博客',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  },
  {
    path: '/projects',
    label: '项目',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  },
  {
    path: '/news',
    label: '新闻',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>`,
  },
  {
    path: '/about',
    label: '关于',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  },
  {
    path: '/favorites',
    label: '收藏',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  },
]

</script>

<style lang="scss" scoped>
// == Expanded state ==
.nav-menu {
  @include glass-card;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  &__item {
    flex: 1;
    background: transparent;
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    border-radius: $radius-lg;
    text-decoration: none;
    color: $text-primary;
    cursor: pointer;
    transition: background 0.3s ease,
                color 0.3s ease,
                box-shadow 0.3s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.45);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      color: #7ec8e3;
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    color: $text-secondary;
  }

  &__label {
    flex: 1;
    font-size: $font-size-base;
    font-weight: 500;
    color: $text-secondary;
  }
}

.nav-menu--page {
  flex-direction: row;
  align-items: center;
  gap: $spacing-lg;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;

  &:hover {
    background: transparent;
    box-shadow: none;
  }

  .nav-menu__item {
    flex: 0 0 auto;
    gap: 0;
    padding: 0;
    border-radius: 0;
    position: relative;
    color: $text-secondary;

    &:hover {
      background: transparent;
      box-shadow: none;
      color: $text-primary;
    }

    &.router-link-active,
    &.router-link-exact-active {
      color: $text-primary;
    }

    &.router-link-active::after,
    &.router-link-exact-active::after {
      content: '';
      position: absolute;
      right: 0;
      bottom: -6px;
      left: 0;
      height: 2px;
      border-radius: 1px;
      background: $accent-primary;
    }
  }

  .nav-menu__icon {
    display: none;
  }

  .nav-menu__label {
    color: inherit;
    font-size: $font-size-sm;
  }
}

.route-navigation--home .nav-menu--home {
  width: 100%;
  height: 100%;
}

@media (max-width: $breakpoint-md) {
  .nav-menu--home {
    flex-direction: row;
    gap: 4px;
    padding: 6px;

    .nav-menu__item {
      flex: 1;
      justify-content: center;
      flex-direction: column;
      gap: 4px;
      padding: 12px 4px;
      border-radius: 14px;
    }

    .nav-menu__label {
      font-size: 13px;
    }
  }

  .nav-menu--page {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    display: flex;
    width: max-content;
    min-width: 160px;
    height: auto;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 6px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.12),
      0 1px 4px rgba(0, 0, 0, 0.06);
    transform-origin: top right;

    .nav-menu__item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 12px 14px;
      border-radius: 12px;
      color: $text-secondary;
      font-size: 15px;
      font-weight: 500;
      white-space: nowrap;

      &:hover,
      &.router-link-active,
      &.router-link-exact-active {
        background: rgba($accent-primary, 0.15);
        color: $text-primary;
      }

      &.router-link-active::after,
      &.router-link-exact-active::after {
        display: none;
      }
    }

    .nav-menu__label {
      font-size: 15px;
    }
  }
}

</style>
