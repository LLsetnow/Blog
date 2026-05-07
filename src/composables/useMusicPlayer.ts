import { ref, computed } from 'vue'
import { musicList } from '@/data/music'
import type { MusicTrack } from '@/types'

// === Module-level singleton state — persists across component instances ===

const isPlaying = ref(false)
const currentIndex = ref(0)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.6)
const targetVolume = ref(0.6)
const isMuted = ref(false)
const isLoading = ref(false)
const hasError = ref(false)
const pendingPlay = ref(false)
let fadeRAF: number | null = null
const FADE_DURATION = 400

const currentTrack = computed<MusicTrack>(() => musicList[currentIndex.value] ?? musicList[0])

const progressPercent = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const volumePercent = computed(() => (isMuted.value ? 0 : volume.value) * 100)

// === Singleton audio element ===

let audio: HTMLAudioElement | null = null

const baseUrl = (import.meta as any).env?.BASE_URL || '/'

function initAudio() {
  if (audio) return
  audio = new Audio()
  audio.volume = 0.01

  audio.addEventListener('timeupdate', () => {
    if (audio) currentTime.value = audio.currentTime
  })
  audio.addEventListener('loadedmetadata', () => {
    if (audio) {
      duration.value = audio.duration
      hasError.value = false
    }
  })
  audio.addEventListener('loadeddata', () => {
    isLoading.value = false
  })
  audio.addEventListener('waiting', () => {
    isLoading.value = true
  })
  audio.addEventListener('canplay', () => {
    isLoading.value = false
    if (pendingPlay.value && audio) {
      pendingPlay.value = false
      audio.play().catch(() => {
        hasError.value = true
        isPlaying.value = false
      })
      fadeVolume(0.01, targetVolume.value)
    }
  })
  audio.addEventListener('error', () => {
    if (pendingPlay.value || isLoading.value) return
    hasError.value = true
    isLoading.value = false
  })
  audio.addEventListener('ended', nextTrack)
}

function cancelFade() {
  if (fadeRAF !== null) {
    cancelAnimationFrame(fadeRAF)
    fadeRAF = null
  }
}

function fadeVolume(from: number, to: number, onDone?: () => void) {
  cancelFade()
  if (!audio) { onDone?.(); return }
  const startTime = performance.now()

  function step(now: number) {
    if (!audio) { onDone?.(); return }
    const elapsed = now - startTime
    const t = Math.min(elapsed / FADE_DURATION, 1)
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

function updateSrc() {
  if (!audio) return
  const src = `${baseUrl}${currentTrack.value.src.replace(/^\//, '')}`
  audio.src = src
}

function togglePlay() {
  initAudio()
  if (!audio || hasError.value) return

  if (isPlaying.value) {
    cancelFade()
    const startVol = audio.volume
    fadeVolume(startVol, 0, () => {
      audio?.pause()
      isPlaying.value = false
    })
  } else {
    updateSrc()
    audio.volume = 0.01
    audio.play().catch(() => {
      hasError.value = true
      isPlaying.value = false
    })
    isPlaying.value = true
    fadeVolume(0.01, targetVolume.value)
  }
}

function nextTrack() {
  initAudio()
  if (musicList.length === 0) return
  if (musicList.length === 1) {
    if (audio) audio.currentTime = 0
    return
  }
  currentIndex.value = (currentIndex.value + 1) % musicList.length
  resetAndPlay()
}

function prevTrack() {
  initAudio()
  if (musicList.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + musicList.length) % musicList.length
  resetAndPlay()
}

function resetAndPlay() {
  currentTime.value = 0
  duration.value = 0
  hasError.value = false
  isLoading.value = true
  cancelFade()
  pendingPlay.value = isPlaying.value
  if (audio) {
    audio.volume = 0.01
    updateSrc()
  }
}

function seek(percent: number) {
  if (audio && duration.value > 0) {
    audio.currentTime = percent * duration.value
    currentTime.value = audio.currentTime
  }
}

function setVolume(val: number) {
  volume.value = val
  targetVolume.value = val
  cancelFade()
  if (audio) audio.volume = val
  if (val > 0 && isMuted.value) isMuted.value = false
}

function toggleMute() {
  if (!audio) return
  isMuted.value = !isMuted.value
  audio.muted = isMuted.value
}

function formatTime(t: number): string {
  if (isNaN(t) || t === 0) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function useMusicPlayer() {
  initAudio()

  return {
    // State
    isPlaying,
    currentIndex,
    currentTime,
    duration,
    volume,
    targetVolume,
    isMuted,
    isLoading,
    hasError,
    currentTrack,
    progressPercent,
    volumePercent,
    // Methods
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    formatTime,
  }
}
