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
                <input
                  type="number"
                  min="50"
                  max="1100"
                  :value="widget.width"
                  class="layout-settings__input"
                  @input="onWidthInput(widget.id, ($event.target as HTMLInputElement).value)"
                />
              </label>
              <label class="layout-settings__field">
                高
                <input
                  type="number"
                  min="50"
                  max="800"
                  :value="widget.height"
                  class="layout-settings__input"
                  @input="onHeightInput(widget.id, ($event.target as HTMLInputElement).value)"
                />
              </label>
            </div>
          </div>
        </div>

        <div class="layout-settings__actions">
          <button class="layout-settings__btn layout-settings__btn--drag" @click="$emit('drag')">
            拖拽布局
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { WidgetLayout } from '@/types'

interface LayoutSettingsProps {
  widgets: WidgetLayout[]
}

const props = defineProps<LayoutSettingsProps>()

const emit = defineEmits<{
  close: []
  drag: []
  updateSize: [id: string, width: number, height: number]
}>()

function onWidthInput(id: string, value: string): void {
  const w = parseInt(value, 10)
  if (!isNaN(w) && w >= 50) {
    const widget = props.widgets.find(wgt => wgt.id === id)
    if (widget) emit('updateSize', id, w, widget.height)
  }
}

function onHeightInput(id: string, value: string): void {
  const h = parseInt(value, 10)
  if (!isNaN(h) && h >= 50) {
    const widget = props.widgets.find(wgt => wgt.id === id)
    if (widget) emit('updateSize', id, widget.width, h)
  }
}
</script>

<style lang="scss" scoped>
.layout-settings {
  @include glass-card;
  position: relative;
  width: 480px;
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
    align-items: center;
    gap: $spacing-xs;
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__input {
    width: 64px;
    padding: 4px 8px;
    border: 1px solid $glass-border;
    border-radius: $radius-sm;
    font-size: $font-size-sm;
    background: rgba(255, 255, 255, 0.6);
    color: $text-primary;
    text-align: center;

    &:focus {
      outline: none;
      border-color: $accent-primary;
    }
  }

  &__actions {
    margin-top: $spacing-lg;
    display: flex;
    justify-content: center;
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
  }
}
</style>
