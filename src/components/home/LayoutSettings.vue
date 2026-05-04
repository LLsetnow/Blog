<template>
  <Teleport to="body">
    <div class="layout-settings-overlay" @click.self="$emit('close')">
      <div class="layout-settings glass-card">
        <div class="layout-settings__header">
          <h2 class="layout-settings__title">布局设置</h2>
          <button class="layout-settings__close" @click="$emit('close')">&times;</button>
        </div>

        <div class="layout-settings__list">
          <div
            v-for="widget in widgets"
            :key="widget.id"
            class="layout-settings__item"
          >
            <span class="layout-settings__label">{{ widget.label }}</span>
            <div class="layout-settings__inputs">
              <label class="layout-settings__field">
                宽
                <div class="layout-settings__number">
                  <button class="layout-settings__step" @click="emit('updateSize', widget.id, Math.max(50, widget.width - 10), widget.height)">−</button>
                  <input
                    type="number"
                    :min="50"
                    :max="1100"
                    :value="widget.width"
                    class="layout-settings__input"
                    @change="onWidthChange(widget.id, ($event.target as HTMLInputElement).value, widget.height)"
                  />
                  <button class="layout-settings__step" @click="emit('updateSize', widget.id, Math.min(1100, widget.width + 10), widget.height)">+</button>
                </div>
              </label>
              <label class="layout-settings__field">
                高
                <div class="layout-settings__number">
                  <button class="layout-settings__step" @click="emit('updateSize', widget.id, widget.width, Math.max(50, widget.height - 10))">−</button>
                  <input
                    type="number"
                    :min="50"
                    :max="800"
                    :value="widget.height"
                    class="layout-settings__input"
                    @change="onHeightChange(widget.id, ($event.target as HTMLInputElement).value, widget.width)"
                  />
                  <button class="layout-settings__step" @click="emit('updateSize', widget.id, widget.width, Math.min(800, widget.height + 10))">+</button>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="layout-settings__actions">
          <button class="layout-settings__btn layout-settings__btn--drag" @click="$emit('drag')">
            拖拽布局
          </button>
          <button class="layout-settings__btn layout-settings__btn--export" @click="doExport">
            {{ copied ? '已复制!' : '导出布局到代码' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { WidgetLayout } from '@/types'
import { generateLayoutCode } from '@/composables/useLayoutEditor'

interface LayoutSettingsProps {
  widgets: WidgetLayout[]
}

const props = defineProps<LayoutSettingsProps>()

const emit = defineEmits<{
  close: []
  drag: []
  updateSize: [id: string, width: number, height: number]
}>()

const copied = ref(false)

function onWidthChange(id: string, value: string, currentHeight: number): void {
  const w = parseInt(value, 10)
  if (!isNaN(w) && w >= 50 && w <= 1100) {
    emit('updateSize', id, w, currentHeight)
  }
}

function onHeightChange(id: string, value: string, currentWidth: number): void {
  const h = parseInt(value, 10)
  if (!isNaN(h) && h >= 50 && h <= 800) {
    emit('updateSize', id, currentWidth, h)
  }
}

async function doExport(): Promise<void> {
  const code = generateLayoutCode()
  try {
    await navigator.clipboard.writeText(code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback: select the text for manual copy
    const textarea = document.createElement('textarea')
    textarea.value = code
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<style lang="scss" scoped>
.layout-settings {
  @include glass-card;
  position: relative;
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  padding: $spacing-lg;
  z-index: 310;

  &-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-lg;
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 700;
    color: $text-primary;
    margin: 0;
  }

  &__close {
    background: none;
    border: none;
    font-size: 28px;
    color: $text-secondary;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    border-radius: $radius-sm;
    transition: color $transition-fast;

    &:hover {
      color: $text-primary;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-sm $spacing-md;
    background: rgba(255, 255, 255, 0.3);
    border-radius: $radius-md;
  }

  &__label {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }

  &__inputs {
    display: flex;
    gap: $spacing-md;
  }

  &__field {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__number {
    display: flex;
    align-items: center;
    gap: 0;
  }

  &__step {
    width: 28px;
    height: 28px;
    border: 1px solid $glass-border;
    background: rgba(255, 255, 255, 0.5);
    color: $text-primary;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background $transition-fast;

    &:first-child {
      border-radius: $radius-sm 0 0 $radius-sm;
    }

    &:last-child {
      border-radius: 0 $radius-sm $radius-sm 0;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.8);
    }
  }

  &__input {
    width: 64px;
    height: 28px;
    padding: 0 4px;
    border: 1px solid $glass-border;
    border-left: none;
    border-right: none;
    font-size: $font-size-sm;
    background: rgba(255, 255, 255, 0.6);
    color: $text-primary;
    text-align: center;
    -moz-appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    &:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.85);
    }
  }

  &__actions {
    margin-top: $spacing-lg;
    display: flex;
    justify-content: center;
    gap: $spacing-md;
    flex-wrap: wrap;
  }

  &__btn {
    padding: $spacing-sm $spacing-xl;
    border: none;
    border-radius: $radius-md;
    font-size: $font-size-base;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    &--drag {
      background: $accent-gradient;
      color: white;

      &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
    }

    &--export {
      background: rgba(255, 255, 255, 0.4);
      color: $text-primary;
      backdrop-filter: blur(8px);

      &:hover {
        background: rgba(255, 255, 255, 0.6);
        transform: translateY(-1px);
      }
    }
  }
}
</style>
