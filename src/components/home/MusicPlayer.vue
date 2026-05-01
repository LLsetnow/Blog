<template>
  <div class="music-player glass-card">
    <!-- Left: icon -->
    <div class="music-player__icon">
      <img src="@/assets/音乐.svg" alt="music" class="music-player__icon-svg" />
    </div>

    <!-- Center: title above, progress below -->
    <div class="music-player__center">
      <p class="music-player__track">{{ currentTrack.title }}</p>
      <div class="music-player__progress" @click="seekTo">
        <div class="music-player__progress-track">
          <div
            class="music-player__progress-fill"
            :style="{ width: progressPercent + '%' }"
          />
        </div>
      </div>
    </div>

    <!-- Right: play/pause only -->
    <div class="music-player__controls">
      <button class="music-player__btn music-player__btn--play" @click="togglePlay">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
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
    audioRef.value.play().catch(() => {})
  }
  isPlaying.value = !isPlaying.value
}

function nextTrack(): void {
  if (musicList.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % musicList.length
  currentTrack.value = musicList[currentIndex.value]
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

  &__center {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__track {
    font-size: $font-size-base;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__progress {
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
  }

  &__controls {
    flex-shrink: 0;
  }

  &__btn {
    background: none;
    border: none;
    cursor: pointer;
    color: $text-primary;
    transition: color $transition-fast;

    &:hover {
      color: $accent-primary;
    }

    &--play {
      font-size: 28px;
      padding: 8px;
    }
  }
}
</style>
