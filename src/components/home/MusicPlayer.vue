<template>
  <div
    class="music-player"
    :class="{
      'music-player--glass': !mini,
      'music-player--mini': mini,
    }"
  >
    <!-- Mini mode: icon + title + play button (v-show for instant switching, no DOM flicker) -->
    <div v-show="mini" class="music-player__mini-content">
      <div class="music-player__mini-icon">
        <img :src="`${baseUrl}assets/音乐.svg`" alt="music" class="music-player__icon-svg" />
      </div>
      <div class="music-player__mini-info">
        <span class="music-player__mini-title">{{ currentTrack.title }}</span>
      </div>
      <button
        class="music-player__mini-btn"
        :class="{ 'music-player__btn--loading': isLoading }"
        :disabled="hasError"
        @click="togglePlay"
      >
        <svg v-if="isLoading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="music-player__spinner">
          <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-linecap="round" />
        </svg>
        <svg v-else-if="isPlaying" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
      </button>
    </div>

    <!-- Full mode: original layout (v-show, always in DOM) -->
    <div v-show="!mini" class="music-player__full-content">
      <div class="music-player__row">
        <div class="music-player__icon">
          <img :src="`${baseUrl}assets/音乐.svg`" alt="music" class="music-player__icon-svg" />
        </div>

        <div class="music-player__info">
          <span class="music-player__title">{{ currentTrack.title }}</span>
          <span class="music-player__artist">{{ currentTrack.artist }}</span>
        </div>

        <div class="music-player__actions">
          <!-- Prev -->
          <button class="music-player__btn" @click="prevTrack" title="上一首">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="4" x2="5" y2="20" />
            </svg>
          </button>

          <!-- Play / Pause -->
          <button
            class="music-player__btn music-player__btn--play"
            :class="{ 'music-player__btn--loading': isLoading }"
            :disabled="hasError"
            @click="togglePlay"
            :title="isPlaying ? '暂停' : '播放'"
          >
            <svg v-if="isLoading" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="music-player__spinner">
              <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-linecap="round" />
            </svg>
            <svg v-else-if="isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          </button>

          <!-- Next -->
          <button class="music-player__btn" @click="nextTrack" title="下一首">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="4" x2="19" y2="20" />
            </svg>
          </button>

          <!-- Volume -->
          <div class="music-player__volume">
            <button class="music-player__btn" @click="toggleMute" :title="isMuted || volume === 0 ? '取消静音' : '静音'">
              <svg v-if="isMuted || volume === 0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </button>
            <div class="music-player__volume-slider" @click="onVolumeClick">
              <div class="music-player__volume-track">
                <div class="music-player__volume-fill" :style="{ width: volumePercent + '%' }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress bar -->
      <div
        class="music-player__progress"
        :class="{ 'music-player__progress--seeking': isSeeking }"
        @pointerdown="startSeek"
        @pointermove="onSeekMove"
        @pointerup="endSeek"
        @pointercancel="endSeek"
      >
        <div class="music-player__progress-track">
          <div class="music-player__progress-fill" :style="{ width: progressPercent + '%' }" />
          <div class="music-player__progress-thumb" :style="{ left: progressPercent + '%' }" />
        </div>
      </div>

      <!-- Time row below progress bar -->
      <div class="music-player__time-row">
        <span class="music-player__time">{{ formatTime(currentTime) }}</span>
        <span class="music-player__time">{{ formatTime(duration) }}</span>
      </div>

      <!-- Error message -->
      <div v-if="hasError && !isLoading" class="music-player__error">
        无法加载音频文件
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMusicPlayer } from '@/composables/useMusicPlayer'

const baseUrl = import.meta.env.BASE_URL || '/'

defineProps<{ mini?: boolean }>()

const {
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isLoading,
  hasError,
  currentTrack,
  progressPercent,
  volumePercent,
  togglePlay,
  nextTrack,
  prevTrack,
  seek,
  setVolume: setVolumeAction,
  toggleMute,
  formatTime,
} = useMusicPlayer()

// Seeking state (local to UI interaction)
const isSeeking = ref(false)

function onVolumeClick(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const val = Math.max(0, Math.min(1, x / rect.width))
  setVolumeAction(val)
}

function computeSeekPercent(event: PointerEvent, target: HTMLElement): number {
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  return Math.max(0, Math.min(1, x / rect.width))
}

function applySeek(percent: number) {
  seek(percent)
}

function startSeek(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  isSeeking.value = true
  applySeek(computeSeekPercent(event, target))
}

function onSeekMove(event: PointerEvent) {
  if (!isSeeking.value) return
  applySeek(computeSeekPercent(event, event.currentTarget as HTMLElement))
}

function endSeek(_event: PointerEvent) {
  if (!isSeeking.value) return
  isSeeking.value = false
}
</script>

<style lang="scss" scoped>
// ===== Mini glass mode (same visual, compact layout) =====
.music-player--mini {
  @include glass;
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  height: 100%;
  overflow: hidden;

  &:hover {
    background: $bg-card-hover;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.8),
      inset 0 0 14px 4px rgba(255, 255, 255, 0.2),
      0 12px 40px rgba(0, 0, 0, 0.12);
  }
}

.music-player__mini-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  .music-player__icon-svg {
    width: 26px;
    height: 26px;
  }
}

.music-player__mini-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.music-player__mini-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-player__mini-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: $accent-gradient;
  color: white;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.85;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  &.music-player__btn--loading {
    pointer-events: none;
  }
}

// ===== Content wrappers for v-show switching =====
.music-player__mini-content {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
}

.music-player__full-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  flex: 1;
  overflow: hidden;
}

// ===== Full glass mode =====
.music-player--glass {
  @include glass;
  border-radius: $radius-xl;
  padding: 24px $spacing-md $spacing-sm;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  overflow: hidden;
  height: 100%;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background $transition-base, box-shadow $transition-base;

  &:hover {
    background: $bg-card-hover;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.8),
      inset 0 0 14px 4px rgba(255, 255, 255, 0.2),
      0 12px 40px rgba(0, 0, 0, 0.12);
  }
}

.music-player {
  &__row {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    min-width: 0;
  }

  &__icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-user-drag: none;

    &-svg {
      width: 40px;
      height: 40px;
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    overflow: hidden;
    user-select: none;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: none;
  }

  &__artist {
    font-size: $font-size-xs;
    color: $text-secondary;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
    flex-shrink: 0;
    user-select: none;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: $text-secondary;
    cursor: pointer;
    outline: none;
    transition: all $transition-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.35);
      color: $text-primary;
    }

    &:active {
      transform: scale(0.9);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &--play {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.25);
      color: $text-primary;

      &:hover {
        background: rgba(255, 255, 255, 0.45);
      }
    }

    &--loading {
      pointer-events: none;
    }
  }

  &__spinner {
    animation: music-spin 1s linear infinite;
  }

  @keyframes music-spin {
    to { transform: rotate(360deg); }
  }

  &__volume {
    display: flex;
    align-items: center;
    gap: 4px;
    user-select: none;
  }

  &__volume-slider {
    width: 48px;
    cursor: pointer;
    padding: 4px 0;
    outline: none;
  }

  &__volume-track {
    height: 4px;
    background: rgba(0, 0, 0, 0.12);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }

  &__volume-fill {
    height: 100%;
    background: $accent-primary;
    border-radius: 2px;
    transition: width 0.1s ease;
  }

  &__time-row {
    display: flex;
    justify-content: space-between;
    padding: 0 2px;
  }

  &__time {
    font-size: $font-size-xs;
    color: $text-muted;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    user-select: none;
  }

  &__progress {
    cursor: pointer;
    padding: 4px 0;
    margin-top: 24px;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;

    &--seeking {
      cursor: grabbing;
    }
  }

  &__progress-track {
    height: 5px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
    position: relative;
    overflow: visible;
    max-width: 95%;
    margin: 0 auto;
  }

  &__progress-fill {
    height: 100%;
    background: $accent-gradient;
    border-radius: 2px;
    transition: width 0.2s linear;
    position: relative;
  }

  &__progress-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }

  &__progress:hover &__progress-thumb,
  &__progress--seeking &__progress-thumb {
    opacity: 1;
  }

  &__progress--seeking &__progress-fill {
    transition: none;
  }

  &__error {
    font-size: $font-size-xs;
    color: #e74c3c;
    text-align: center;
    padding: 2px 0;
  }
}
</style>
