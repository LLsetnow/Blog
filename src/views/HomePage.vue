<template>
  <div class="home-page">
    <div class="home-page__container">
      <!-- Greeting -->
      <div class="home-page__cell" :style="getWidgetStyle('greeting')">
        <TiltEffect :disabled="isDragMode">
          <GreetingCard />
        </TiltEffect>
      </div>

      <!-- Calendar -->
      <div class="home-page__cell" :style="getWidgetStyle('calendar')">
        <TiltEffect :disabled="isDragMode">
          <CalendarWidget />
        </TiltEffect>
      </div>

      <!-- GitHub -->
      <div class="home-page__cell" :style="getWidgetStyle('github')">
        <TiltEffect :disabled="isDragMode">
          <GitHubCard />
        </TiltEffect>
      </div>

      <!-- Clock -->
      <div class="home-page__cell" :style="getWidgetStyle('clock')">
        <TiltEffect :disabled="isDragMode">
          <ClockWidget />
        </TiltEffect>
      </div>

      <!-- Music -->
      <div class="home-page__cell" :style="getWidgetStyle('music')">
        <TiltEffect :disabled="isDragMode">
          <MusicPlayer />
        </TiltEffect>
      </div>

      <!-- Gallery -->
      <div class="home-page__cell" :style="getWidgetStyle('gallery')">
        <TiltEffect :disabled="isDragMode">
          <ImageGallery />
        </TiltEffect>
      </div>

      <!-- Nav -->
      <div v-if="!navCollapsed" class="home-page__cell" :style="getWidgetStyle('nav')">
        <TiltEffect :disabled="isDragMode">
          <NavMenu @collapse="navCollapsed = true" />
        </TiltEffect>
      </div>

      <!-- Email -->
      <div class="home-page__cell" :style="getWidgetStyle('email')">
        <TiltEffect :disabled="isDragMode">
          <EmailWidget />
        </TiltEffect>
      </div>

      <!-- WeChat -->
      <div class="home-page__cell" :style="getWidgetStyle('wechat')">
        <TiltEffect :disabled="isDragMode">
          <WeChatWidget />
        </TiltEffect>
      </div>

      <!-- Settings button -->
      <button v-if="!navCollapsed" class="home-page__settings-btn" @click="openSettings">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>

      <!-- Drag overlay (visual only, covers page to prevent clicks) -->
      <div v-if="isDragMode" class="home-page__drag-overlay" />

      <!-- Drag handles (in drag mode) -->
      <div
        v-for="w in layouts"
        :key="'handle-' + w.id"
        v-show="isDragMode"
        class="home-page__drag-handle"
        :class="{ 'home-page__drag-handle--active': draggingId === w.id }"
        :style="dragHandleStyle(w)"
        @pointerdown.prevent="startDrag(w.id, $event)"
        @pointermove="onDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      />

      <!-- Save / Cancel buttons -->
      <div v-if="isDragMode" class="home-page__drag-actions">
        <button class="home-page__drag-btn home-page__drag-btn--save" @click="saveOffsets">
          保存偏移
        </button>
        <button class="home-page__drag-btn home-page__drag-btn--cancel" @click="cancelDrag">
          取消
        </button>
      </div>
    </div>

    <!-- Toast notifications -->
    <ToastNotification :toasts="toasts" />

    <!-- Settings modal -->
    <LayoutSettings
      v-if="isSettingsOpen"
      :widgets="layouts"
      @close="closeSettings"
      @drag="enterDragMode"
      @update-size="updateSize"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { WidgetLayout } from '@/types'
import GreetingCard from '@/components/home/GreetingCard.vue'
import ClockWidget from '@/components/home/ClockWidget.vue'
import MusicPlayer from '@/components/home/MusicPlayer.vue'
import CalendarWidget from '@/components/home/CalendarWidget.vue'
import NavMenu from '@/components/home/NavMenu.vue'
import GitHubCard from '@/components/home/GitHubCard.vue'
import ImageGallery from '@/components/home/ImageGallery.vue'
import EmailWidget from '@/components/home/EmailWidget.vue'
import WeChatWidget from '@/components/home/WeChatWidget.vue'
import TiltEffect from '@/components/common/TiltEffect.vue'
import LayoutSettings from '@/components/home/LayoutSettings.vue'
import ToastNotification from '@/components/common/ToastNotification.vue'
import { useToast } from '@/composables/useToast'
import { useLayoutEditor } from '@/composables/useLayoutEditor'

const {
  isSettingsOpen,
  isDragMode,
  draggingId,
  layouts,
  offsets,
  getWidgetStyle,
  updateSize,
  startDrag,
  onDrag,
  endDrag,
  saveOffsets,
  openSettings,
  closeSettings,
  enterDragMode,
  cancelDrag,
} = useLayoutEditor()

const { toasts } = useToast()

const navCollapsed = ref(false)

// Reset nav when returning to home page
const route = useRoute()
watch(() => route.path, (path) => {
  if (path === '/') {
    navCollapsed.value = false
  }
})

/** Compute drag handle inline style from widget base + offset */
function dragHandleStyle(w: WidgetLayout): Record<string, string> {
  const off = offsets.value[w.id]
  return {
    left: `${w.left + (off?.x ?? 0)}px`,
    top: `${w.top + (off?.y ?? 0)}px`,
    width: `${w.width}px`,
    height: `${w.height}px`,
  }
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: $bg-gradient;
  background-attachment: fixed;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: auto;

  &::before,
  &::after {
    content: '';
    flex: 1;
    min-height: 0;
    pointer-events: none;
  }

  &::before {
    flex: 0.42;
  }

  &__container {
    position: relative;
    width: 1100px;
    flex-shrink: 0;
    padding: 40px 0;
    min-height: 800px;
  }

  &__cell {
    position: absolute;
  }

  // Settings gear button (fixed position, always visible)
  &__settings-btn {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 290;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(10px);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.65),
      inset 0 0 8px 2px rgba(255, 255, 255, 0.12);
    color: $text-secondary;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all $transition-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.6);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.8),
        inset 0 0 12px 3px rgba(255, 255, 255, 0.2);
      color: $text-primary;
      transform: rotate(30deg);
    }
  }

  // Drag overlay — prevents interaction with widgets
  &__drag-overlay {
    position: fixed;
    inset: 0;
    z-index: $z-drag-overlay;
    background: rgba(0, 0, 0, 0.06);
  }

  // Drag handles — transparent grab zones on top of each widget
  &__drag-handle {
    position: absolute;
    z-index: calc($z-drag-overlay + 1);
    cursor: grab;
    border: 2px dashed rgba(126, 200, 227, 0.4);
    border-radius: $radius-xl;
    transition: border-color 0.2s ease, background 0.2s ease;

    &:hover {
      border-color: $accent-primary;
      background: rgba(126, 200, 227, 0.06);
    }

    &--active {
      border-color: $accent-primary;
      background: rgba(126, 200, 227, 0.1);
      cursor: grabbing;
    }
  }

  // Drag mode action buttons
  &__drag-actions {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: calc($z-drag-overlay + 2);
    display: flex;
    gap: $spacing-md;
  }

  &__drag-btn {
    padding: 12px 32px;
    border: none;
    border-radius: $radius-md;
    font-size: $font-size-base;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    &--save {
      background: $accent-gradient;
      color: white;

      &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
    }

    &--cancel {
      background: rgba(255, 255, 255, 0.6);
      color: $text-primary;
      backdrop-filter: blur(8px);

      &:hover {
        background: rgba(255, 255, 255, 0.8);
      }
    }
  }
}
</style>
