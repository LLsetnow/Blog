<template>
  <div class="music-player glass-card">
    <!-- Top row: info + controls -->
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
          <div class="music-player__volume-slider" @click="setVolume">
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

    <audio
      ref="audioRef"
      :src="trackSrc"
      @ended="nextTrack"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @loadeddata="onLoadedData"
      @waiting="onWaiting"
      @canplay="onCanPlay"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { musicList } from '@/data/music'
import type { MusicTrack } from '@/types'

const baseUrl = import.meta.env.BASE_URL || '/'

const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentIndex = ref(0)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.6)
const isMuted = ref(false)
const isLoading = ref(false)
const hasError = ref(false)

/** Actual volume intended by user (before fade override) */
const targetVolume = ref(0.6)

/** Set true when switching tracks during playback — defers play() until canplay */
const pendingPlay = ref(false)

/** requestAnimationFrame id for fade animation */
let fadeRAF: number | null = null

const FADE_DURATION = 400 // ms

const currentTrack = computed<MusicTrack>(() => musicList[currentIndex.value] ?? musicList[0])
const trackSrc = computed(() => `${baseUrl}${currentTrack.value.src.replace(/^\//, '')}`)

const progressPercent = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const volumePercent = computed(() => {
  return (isMuted.value ? 0 : volume.value) * 100
})

function formatTime(t: number): string {
  if (isNaN(t) || t === 0) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const isSeeking = ref(false)

function onTimeUpdate(): void {
  if (isSeeking.value || !audioRef.value) return
  currentTime.value = audioRef.value.currentTime
}

function onLoadedMetadata(): void {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
    hasError.value = false
  }
}

function onLoadedData(): void {
  isLoading.value = false
}

function onWaiting(): void {
  isLoading.value = true
}

function onCanPlay(): void {
  isLoading.value = false
  if (pendingPlay.value && audioRef.value) {
    pendingPlay.value = false
    audioRef.value.play().catch(() => {
      hasError.value = true
      isPlaying.value = false
    })
    fadeVolume(0.01, targetVolume.value)
  }
}

function onError(): void {
  // Ignore transient errors during track switch / load
  if (pendingPlay.value || isLoading.value) return
  hasError.value = true
  isLoading.value = false
}

/** Cancel any running fade animation */
function cancelFade(): void {
  if (fadeRAF !== null) {
    cancelAnimationFrame(fadeRAF)
    fadeRAF = null
  }
}

/** Ramp audio.volume from current to target over FADE_DURATION ms */
function fadeVolume(from: number, to: number, onDone?: () => void): void {
  cancelFade()
  const audio = audioRef.value
  if (!audio) { onDone?.(); return }

  const startTime = performance.now()

  function step(now: number): void {
    const elapsed = now - startTime
    const t = Math.min(elapsed / FADE_DURATION, 1) // 0→1
    // Linear interpolation
    audio.volume = from + (to - from) * t

    if (t < 1) {
      fadeRAF = requestAnimationFrame(step)
    } else {
      fadeRAF = null
      onDone?.()
    }
  }

  fadeRAF = requestAnimationFrame(step)
}

function togglePlay(): void {
  if (!audioRef.value || hasError.value) return

  if (isPlaying.value) {
    // Fade out, then pause
    cancelFade()
    const audio = audioRef.value
    const startVol = audio.volume
    fadeVolume(startVol, 0, () => {
      if (audio) audio.pause()
      isPlaying.value = false
    })
  } else {
    // Start playing at near-zero volume, then fade in to target
    const audio = audioRef.value
    audio.volume = 0.01
    audio.play().catch(() => {
      hasError.value = true
      isPlaying.value = false
    })
    isPlaying.value = true
    fadeVolume(0.01, targetVolume.value)
  }
}

function prevTrack(): void {
  if (musicList.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + musicList.length) % musicList.length
  resetAndPlay()
}

function nextTrack(): void {
  if (musicList.length === 0) return
  // If only one track, replay from start
  if (musicList.length === 1) {
    if (audioRef.value) {
      audioRef.value.currentTime = 0
    }
    return
  }
  currentIndex.value = (currentIndex.value + 1) % musicList.length
  resetAndPlay()
}

function resetAndPlay(): void {
  currentTime.value = 0
  duration.value = 0
  hasError.value = false
  isLoading.value = true
  cancelFade()
  // Vue's :src binding updates asynchronously — audio element will
  // start loading the new src automatically. Set pendingPlay to
  // auto-start when canplay fires.
  pendingPlay.value = isPlaying.value
  if (audioRef.value) {
    audioRef.value.volume = 0.01
  }
}

function computeSeekPercent(event: PointerEvent, target: HTMLElement): number {
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  return Math.max(0, Math.min(1, x / rect.width))
}

function applySeek(percent: number): void {
  if (audioRef.value && duration.value > 0) {
    audioRef.value.currentTime = percent * duration.value
    currentTime.value = audioRef.value.currentTime
  }
}

function startSeek(event: PointerEvent): void {
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  isSeeking.value = true
  applySeek(computeSeekPercent(event, target))
}

function onSeekMove(event: PointerEvent): void {
  if (!isSeeking.value) return
  applySeek(computeSeekPercent(event, event.currentTarget as HTMLElement))
}

function endSeek(event: PointerEvent): void {
  if (!isSeeking.value) return
  isSeeking.value = false
  // Position already committed by last applySeek call
  void event
}

function setVolume(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const val = Math.max(0, Math.min(1, x / rect.width))
  volume.value = val
  targetVolume.value = val
  cancelFade()
  if (audioRef.value) {
    audioRef.value.volume = val
  }
  if (val > 0 && isMuted.value) {
    isMuted.value = false
  }
}

function toggleMute(): void {
  if (!audioRef.value) return
  isMuted.value = !isMuted.value
  audioRef.value.muted = isMuted.value
}
</script>

<style lang="scss" scoped>
.music-player {
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
  transition: all $transition-base;

  &:hover {
    background: $bg-card-hover;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.8),
      inset 0 0 14px 4px rgba(255, 255, 255, 0.2),
      0 12px 40px rgba(0, 0, 0, 0.12);
  }

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
