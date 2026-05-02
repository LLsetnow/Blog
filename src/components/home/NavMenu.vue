<template>
  <!-- Expanded: vertical card inside the cell -->
  <div v-show="expanded" ref="expandedRef" class="nav-menu glass-card">
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

  <!-- Collapsed: always Teleported to body, hidden when expanded -->
  <Teleport to="body">
    <div
      ref="collapsedRef"
      class="nav-menu nav-menu--collapsed"
      :class="{ 'nav-menu--hidden': expanded }"
      :style="animStyle"
      @transitionend="onTransitionEnd"
    >
      <router-link to="/" class="nav-menu__avatar">
        <img :src="`${baseUrl}docs/avatar.jpg`" alt="home" />
      </router-link>
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="nav-menu__item nav-menu__item--icon-only"
      >
        <span class="nav-menu__icon" v-html="item.icon" />
      </router-link>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const baseUrl = import.meta.env.BASE_URL || '/'

interface MenuItem {
  path: string
  label: string
  icon: string
}

const emit = defineEmits<{
  collapse: []
}>()

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

const expanded = ref(true)
const expandedRef = ref<HTMLElement | null>(null)
const collapsedRef = ref<HTMLElement | null>(null)
const animStyle = ref<Record<string, string>>({})
const transitioning = ref(false)
const pendingPath = ref<string | null>(null)

async function onNavClick(path: string) {
  if (!expanded.value || transitioning.value) return

  const el = expandedRef.value
  if (!el) return

  pendingPath.value = path

  // FIRST: capture current position of the expanded card
  const first = el.getBoundingClientRect()

  // Switch: hide expanded, show collapsed (Teleported to body, top-right fixed)
  expanded.value = false
  transitioning.value = true
  await nextTick()

  // LAST: collapsed element is now visible at its target position
  const newEl = collapsedRef.value
  if (!newEl) return
  const last = newEl.getBoundingClientRect()

  // INVERT: calculate inverse transform so element visually stays in place
  const dx = first.left - last.left
  const dy = first.top - last.top
  const scaleX = first.width / last.width
  const scaleY = first.height / last.height

  // Apply inverse transform with NO transition — jump to original visual position
  animStyle.value = {
    transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
    transition: 'none',
    transformOrigin: 'top left',
  }

  // Force layout reflow by reading a layout property
  newEl.getBoundingClientRect()

  // PLAY: animate to identity transform
  animStyle.value = {
    transform: 'translate(0, 0) scale(1, 1)',
    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transformOrigin: 'top left',
  }
}

function onTransitionEnd(): void {
  transitioning.value = false
  animStyle.value = {}
  emit('collapse')
  if (pendingPath.value) {
    router.push(pendingPath.value)
    pendingPath.value = null
  }
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
    transition: all 0.3s ease;

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

// == Collapsed state (always in DOM via Teleport) ==
.nav-menu--collapsed {
  @include glass;
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: $z-modal;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 20px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: none;

  .nav-menu__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    margin-right: 4px;
    text-decoration: none;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .nav-menu__item {
    flex: none;
    padding: 8px;
    border-radius: 12px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: $text-primary;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.45);
      color: #7ec8e3;
    }
  }

  .nav-menu__label {
    display: none;
  }
}

// Hidden state applied via class toggle
.nav-menu--hidden {
  display: none;
}
</style>
