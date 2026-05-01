<template>
  <div class="music-player glass-card">
    <!-- Left: icon -->
    <div class="music-player__icon">
      <img src="@/assets/音乐.svg" alt="music" class="music-player__icon-svg" />
    </div>

    <!-- Center-left: track info -->
    <div class="music-player__info">
      <p class="music-player__track">{{ currentTrack.title }}</p>
      <p class="music-player__artist">{{ currentTrack.artist }}</p>
    </div>

    <!-- Center: progress -->
    <div class="music-player__progress" @click="seekTo">
      <div class="music-player__progress-track">
        <div
          class="music-player__progress-fill"
          :style="{ width: progressPercent + '%' }"
        />
      </div>
      <div class="music-player__progress-time">
        <span>{{ currentTimeStr }}</span>
        <span>{{ durationStr }}</span>
      </div>
    </div>

    <!-- Right: controls -->
    <div class="music-player__controls">
      <button class="music-player__btn" @click="prevTrack">&#x23EE;</button>
      <button class="music-player__btn music-player__btn--play" @click="togglePlay">
        {{ isPlaying ? '&#x23F8;' : '&#x25B6;' }}
      </button>
      <button class="music-player__btn" @click="nextTrack">&#x23ED;</button>
    </div>

    <audio
      ref="audioRef"
      :src="currentTrack.src"
      @ended="nextTrack"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { musicList } from '@/data/music'
import type { MusicTrack } from '@/types'

const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentIndex = ref(0)
const currentTime = ref(0)
const duration = ref(0)

const currentTrack = ref<MusicTrack>(musicList[0])

const progressPercent = computed<number>(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const currentTimeStr = computed<string>(() => formatTime(currentTime.value))
const durationStr = computed<string>(() => formatTime(duration.value))

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function onTimeUpdate(): void {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

function onLoadedMetadata(): void {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
  }
}

function togglePlay(): void {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play().catch(() => {
      // Autoplay may be blocked
    })
  }
  isPlaying.value = !isPlaying.value
}

function prevTrack(): void {
  if (musicList.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + musicList.length) % musicList.length
  currentTrack.value = musicList[currentIndex.value]
  resetPlayer()
}

function nextTrack(): void {
  if (musicList.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % musicList.length
  currentTrack.value = musicList[currentIndex.value]
  resetPlayer()
}

function resetPlayer(): void {
  currentTime.value = 0
  duration.value = 0
  if (isPlaying.value && audioRef.value) {
    audioRef.value.load()
    audioRef.value.play().catch(() => {})
  }
}

function seekTo(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percent = x / rect.width
  if (audioRef.value && duration.value > 0) {
    audioRef.value.currentTime = percent * duration.value
  }
}
</script>

<style lang="scss" scoped>
.music-player {
  @include glass-card;
  width: 100%;
  aspect-ratio: 4 / 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;

  &__icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;

    &-svg {
      width: 32px;
      height: 32px;
    }
  }

  &__info {
    flex-shrink: 0;
    min-width: 0;
  }

  &__track {
    font-size: $font-size-base;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__artist {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__progress {
    flex: 1;
    min-width: 0;
    cursor: pointer;

    &-track {
      height: 4px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 2px;
      overflow: hidden;
    }

    &-fill {
      height: 100%;
      background: $accent-primary;
      border-radius: 2px;
      transition: width 0.3s linear;
    }

    &-time {
      display: flex;
      justify-content: space-between;
      margin-top: $spacing-xs;
      font-size: $font-size-xs;
      color: $text-muted;
      font-family: $font-mono;
    }
  }

  &__controls {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__btn {
    background: none;
    border: none;
    font-size: 18px;
    line-height: 1;
    padding: 6px 10px;
    cursor: pointer;
    color: $text-primary;
    transition: color $transition-fast;

    &:hover {
      color: $accent-primary;
    }

    &--play {
      font-size: 22px;
      padding: 8px 14px;
    }
  }
}
</style>
