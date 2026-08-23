<template>
  <!-- Expanded: vertical card inside the cell -->
  <div class="nav-menu glass-card">
    <router-link
      v-for="item in menuItems"
      :key="item.path"
      :to="item.path"
      class="nav-menu__item"
      @click.prevent="onNavClick(item.path)"
    >
      <span class="nav-menu__icon" v-html="item.icon" />
      <span class="nav-menu__label">{{ item.label }}</span>
    </router-link>
  </div>

</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

interface MenuItem {
  path: string
  label: string
  icon: string
}

const router = useRouter()

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

function onNavClick(path: string): void {
  void router.push(path)
}
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

</style>
