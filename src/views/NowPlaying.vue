<template>
  <div class="now-playing" :style="ambientStyle">
    <button class="now-playing__back" type="button" aria-label="返回" @click="goBack">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <div class="now-playing__stage">
      <!-- Left: artwork and transport -->
      <section class="now-playing__deck">
        <div class="now-playing__cover" :class="{ 'now-playing__cover--idle': !isPlaying }">
          <img v-if="currentTrack.cover" :src="cover" :alt="currentTrack.title" />
          <div v-else class="now-playing__cover-fallback">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" />
            </svg>
          </div>
        </div>

        <div class="now-playing__meta">
          <h1 class="now-playing__title">{{ currentTrack.title }}</h1>
          <p class="now-playing__artist">
            {{ currentTrack.artist }}<template v-if="currentTrack.album"> — {{ currentTrack.album }}</template>
          </p>
        </div>

        <div class="now-playing__progress">
          <span class="now-playing__time">{{ formatTime(currentTime) }}</span>
          <div
            ref="barRef"
            class="now-playing__bar"
            role="slider"
            :aria-valuenow="Math.round(progressPercent)"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="播放进度"
            tabindex="0"
            @click="onSeek"
            @keydown="onBarKey"
          >
            <div class="now-playing__bar-fill" :style="{ width: `${progressPercent}%` }" />
          </div>
          <span class="now-playing__time">{{ formatTime(duration) }}</span>
        </div>

        <div class="now-playing__controls">
          <button type="button" aria-label="上一首" @click="prevTrack">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </button>
          <button class="now-playing__play" type="button" :aria-label="isPlaying ? '暂停' : '播放'" @click="togglePlay">
            <svg v-if="isPlaying" width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            <svg v-else width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button type="button" aria-label="下一首" @click="nextTrack">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" /></svg>
          </button>
        </div>
      </section>

      <!-- Right: lyrics -->
      <section ref="lyricsRef" class="now-playing__lyrics">
        <p v-if="!lyrics.length" class="now-playing__no-lyrics">
          {{ currentTrack.neteaseId ? '这首歌没有歌词' : '本地音轨，暂无歌词' }}
        </p>

        <template v-else>
          <!-- Leading spacer so the first line can sit mid-panel like the rest -->
          <div class="now-playing__lyric-pad" />
          <button
            v-for="(line, index) in lyrics"
            :key="index"
            :ref="el => setLineRef(el as HTMLElement | null, index)"
            type="button"
            class="now-playing__line"
            :class="{ 'now-playing__line--active': index === activeIndex }"
            @click="seek(line.time)"
          >
            <span class="now-playing__line-text">{{ line.text }}</span>
            <span v-if="line.trans" class="now-playing__line-trans">{{ line.trans }}</span>
          </button>
          <div class="now-playing__lyric-pad" />
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicPlayer } from '@/composables/useMusicPlayer'

const router = useRouter()

const {
  isPlaying,
  currentTime,
  duration,
  currentTrack,
  progressPercent,
  togglePlay,
  nextTrack,
  prevTrack,
  seek: seekTo,
  formatTime,
} = useMusicPlayer()

const lyricsRef = ref<HTMLElement | null>(null)
const barRef = ref<HTMLElement | null>(null)
const lineRefs = ref<(HTMLElement | null)[]>([])

function setLineRef(el: HTMLElement | null, index: number) {
  lineRefs.value[index] = el
}

const lyrics = computed(() => currentTrack.value.lyrics ?? [])

/** NetEase's image CDN resizes on the fly, so ask for what we actually show. */
const cover = computed(() =>
  currentTrack.value.cover ? `${currentTrack.value.cover}?param=640y640` : '',
)

/**
 * Tint the page with the cover's own palette.
 *
 * Reading real pixels would need a canvas and a CORS-enabled image; deriving a
 * stable hue from the cover URL gets a per-song colour for far less, and stays
 * in the site's pastel range instead of whatever the artwork happens to be.
 */
const ambientStyle = computed(() => {
  const url = currentTrack.value.cover ?? currentTrack.value.title
  let hash = 0
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) >>> 0
  const hue = hash % 360
  return {
    '--ambient-a': `hsl(${hue} 62% 74%)`,
    '--ambient-b': `hsl(${(hue + 42) % 360} 58% 82%)`,
  }
})

/**
 * Index of the line currently being sung: the last one whose timestamp has
 * passed. Driven by currentTime rather than a timer of its own, so it stays in
 * step with seeking and pausing for free.
 */
const activeIndex = computed(() => {
  const list = lyrics.value
  if (!list.length) return -1
  let lo = 0
  let hi = list.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (list[mid].time <= currentTime.value) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
})

// Keep the active line centred. `scrollTop` rather than scrollIntoView, which
// would drag the whole page around inside an embedded viewport.
watch(activeIndex, async index => {
  if (index < 0) return
  await nextTick()
  const container = lyricsRef.value
  const line = lineRefs.value[index]
  if (!container || !line) return
  container.scrollTo({
    top: line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2,
    behavior: 'smooth',
  })
})

// seekTo takes a 0–1 fraction, while progressPercent is 0–100. Keeping that
// straight matters: passing a percentage seeks a hundred times too far.
function seek(time: number) {
  if (duration.value > 0) seekTo(time / duration.value)
}

function onSeek(e: MouseEvent) {
  const bar = barRef.value
  if (!bar) return
  const rect = bar.getBoundingClientRect()
  seekTo(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
}

function onBarKey(e: KeyboardEvent) {
  const step = e.key === 'ArrowRight' ? 0.05 : e.key === 'ArrowLeft' ? -0.05 : 0
  if (!step) return
  e.preventDefault()
  seekTo(Math.min(1, Math.max(0, progressPercent.value / 100 + step)))
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') goBack()
}
window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// Line refs are indexed by position, so drop stale entries when the song changes.
watch(currentTrack, () => {
  lineRefs.value = []
})
</script>

<style lang="scss" scoped>
.now-playing {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-2xl;
  overflow: hidden;
  // Sits above the site backdrop: this page is its own environment.
  background:
    radial-gradient(120% 90% at 18% 20%, var(--ambient-a) 0%, transparent 60%),
    radial-gradient(110% 80% at 82% 78%, var(--ambient-b) 0%, transparent 62%),
    $bg-gradient;

  &__back {
    position: fixed;
    top: $spacing-lg;
    left: $spacing-lg;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: $radius-round;
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: $text-primary;
    cursor: pointer;
    transition: background $transition-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.7);
    }
  }

  &__stage {
    display: grid;
    grid-template-columns: minmax(280px, 380px) minmax(0, 520px);
    gap: $spacing-3xl;
    align-items: center;
    width: 100%;
    max-width: 1040px;
  }

  // ── Left column ──
  &__deck {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    min-width: 0;
  }

  &__cover {
    aspect-ratio: 1;
    border-radius: $radius-xl;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(45, 45, 58, 0.28);
    // Shrinks slightly while paused, the way a record player winds down.
    transition: transform 0.6s $transition-base, box-shadow 0.6s ease;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    &--idle {
      transform: scale(0.94);
      box-shadow: 0 12px 36px rgba(45, 45, 58, 0.2);
    }
  }

  &__cover-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.35);
    color: $text-muted;
  }

  &__meta {
    min-width: 0;
  }

  &__title {
    font-size: $font-size-xl;
    font-weight: 700;
    color: $text-primary;
    line-height: 1.25;
    text-wrap: balance;
  }

  &__artist {
    margin-top: 2px;
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__progress {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__time {
    font-family: $font-mono;
    font-size: $font-size-xs;
    color: $text-muted;
    font-variant-numeric: tabular-nums;
  }

  &__bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.55);
    cursor: pointer;
  }

  &__bar-fill {
    height: 100%;
    border-radius: 2px;
    background: $text-primary;
    transition: width 0.15s linear;
  }

  &__controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-lg;

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      color: $text-secondary;
      cursor: pointer;
      padding: 4px;
      transition: color $transition-fast, transform $transition-fast;

      &:hover {
        color: $text-primary;
        transform: scale(1.08);
      }
    }
  }

  &__play {
    width: 52px;
    height: 52px;
    border-radius: $radius-round;
    background: rgba(255, 255, 255, 0.55) !important;
    color: $text-primary !important;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    &:hover {
      background: rgba(255, 255, 255, 0.8) !important;
    }
  }

  // ── Right column ──
  &__lyrics {
    height: min(72vh, 620px);
    overflow-y: auto;
    scrollbar-width: none;
    // The panel fades at both ends so lines enter and leave rather than
    // being cut off by a hard edge.
    mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent);
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent);

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__lyric-pad {
    height: 40%;
  }

  &__no-lyrics {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: $text-muted;
    font-size: $font-size-sm;
  }

  &__line {
    display: block;
    width: 100%;
    padding: $spacing-sm 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    color: $text-secondary;
    opacity: 0.5;
    transition: opacity $transition-base, color $transition-base, transform $transition-base;

    &:hover {
      opacity: 0.8;
    }

    &--active {
      opacity: 1;
      color: $text-primary;
      // Nudged rather than scaled: scaling reflows neighbouring lines and
      // makes the whole column jitter as the song advances.
      transform: translateX(6px);
    }
  }

  &__line-text {
    display: block;
    font-size: $font-size-lg;
    font-weight: 600;
    line-height: 1.5;
  }

  &__line-trans {
    display: block;
    margin-top: 2px;
    font-size: $font-size-sm;
    color: $text-muted;
    line-height: 1.5;
  }
}

@media (max-width: $breakpoint-lg) {
  .now-playing {
    padding: $spacing-lg;

    &__stage {
      grid-template-columns: 1fr;
      gap: $spacing-xl;
      max-width: 460px;
    }

    &__lyrics {
      height: 40vh;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .now-playing__cover,
  .now-playing__line,
  .now-playing__bar-fill {
    transition: none;
  }
}
</style>
