<template>
  <div class="image-gallery glass-card">
    <div class="image-gallery__grid">
      <div
        v-for="(img, index) in images"
        :key="index"
        class="image-gallery__item"
        :class="{ 'image-gallery__item--loaded': loadedThumbs.has(index) }"
        @click="openPreview(index)"
        @mouseenter="preloadFull(index)"
      >
        <div v-if="!loadedThumbs.has(index)" class="image-gallery__skeleton" />
        <picture :class="{ 'image-gallery__picture--loaded': loadedThumbs.has(index) }">
          <source :srcset="img.thumb" type="image/webp" />
          <img
            :src="img.thumbFallback"
            :alt="img.alt"
            loading="lazy"
            decoding="async"
            @load="onThumbLoaded(index)"
          />
        </picture>
      </div>
    </div>

    <!-- Lightbox overlay -->
    <Teleport to="body">
      <div
        v-if="previewIndex !== null"
        class="image-gallery__preview"
        @click="closePreview"
      >
        <div v-if="previewLoading" class="image-gallery__spinner" />
        <div
          ref="previewRef"
          class="image-gallery__preview-image"
          :class="{ 'image-gallery__preview-image--visible': !previewLoading }"
          @mousemove="onPreviewMouseMove"
          @mouseleave="onPreviewMouseLeave"
          @click.stop
        >
          <img
            :src="images[previewIndex].full"
            :alt="images[previewIndex].alt"
            @load="onPreviewLoaded"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const baseUrl = import.meta.env.BASE_URL || '/'

interface GalleryImage {
  thumb: string
  thumbFallback: string
  full: string
  alt: string
}

const imageFiles = [
  '0f068ff38e8886968d1c3d7bad3dd3fa',
  '1a08ca749fe362f5c1a8fe12a34c046d',
  '250d05939b7707c00fcdbf0954dd4aab',
  '2dfa9ac1040bfc61423e341eb4eea8db',
  '567a7b906eb50dc9f0fcdb9cba007a47',
  '90909f68a40d1efbbd42910cb4dbd2f8',
  '9d45ebdcaa221489e0362d661b660e8e',
  'ab30291ca94bb013c8a6121aa7c22764',
]

const images: GalleryImage[] = imageFiles.map((name, i) => ({
  thumb: `${baseUrl}img/thumbnails/${name}.webp`,
  thumbFallback: `${baseUrl}img/thumbnails/${name}.jpg`,
  full: `${baseUrl}img/${name}.jpg`,
  alt: `Gallery ${i + 1}`,
}))

const previewIndex = ref<number | null>(null)
const previewRef = ref<HTMLElement | null>(null)
const previewLoading = ref(false)
const loadedThumbs = reactive(new Set<number>())
const preloadedFulls = new Set<number>()

function onThumbLoaded(index: number) {
  loadedThumbs.add(index)
}

function preloadFull(index: number) {
  if (preloadedFulls.has(index)) return
  preloadedFulls.add(index)
  const img = new Image()
  img.src = images[index].full
}

function openPreview(index: number) {
  preloadFull(index)
  previewLoading.value = true
  previewIndex.value = index
}

function onPreviewLoaded() {
  previewLoading.value = false
}

function closePreview() {
  previewIndex.value = null
  previewLoading.value = false
  if (previewRef.value) {
    previewRef.value.style.transform = ''
    previewRef.value.style.transition = ''
  }
}

function onPreviewMouseMove(event: MouseEvent) {
  const el = previewRef.value
  if (!el) return
  el.style.transition = 'transform 0.1s ease-out'

  const rect = el.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const deltaX = (event.clientX - centerX) / rect.width
  const deltaY = (event.clientY - centerY) / rect.height

  el.style.transform = `perspective(1000px) rotateX(${deltaY * -12}deg) rotateY(${deltaX * 12}deg)`
}

function onPreviewMouseLeave() {
  const el = previewRef.value
  if (!el) return
  el.style.transition = 'transform 0.4s ease'
  el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
}
</script>

<style lang="scss" scoped>
.image-gallery {
  @include glass-card;
  width: 100%;
  height: 100%;

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: 1fr 1fr;
    gap: 8px;
    height: 100%;
  }

  &__item {
    border-radius: $radius-sm;
    overflow: hidden;
    cursor: pointer;
    position: relative;
    background: rgba(255, 255, 255, 0.05);

    picture {
      display: block;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .image-gallery__picture--loaded {
      opacity: 1;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    @media (hover: hover) and (pointer: fine) {
      &:hover img {
        transform: scale(1.1);
      }
    }
  }

  &__skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.04) 25%,
      rgba(255, 255, 255, 0.08) 50%,
      rgba(255, 255, 255, 0.04) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.2s ease-in-out infinite;
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// Lightbox overlay (Teleported to body, unscoped)
.image-gallery__preview {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;

  .image-gallery__preview-image {
    max-width: 75vw;
    max-height: 80vh;
    border-radius: $radius-lg;
    overflow: hidden;
    cursor: default;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
    transform-style: preserve-3d;
    will-change: transform;
    opacity: 0;
    transition: opacity 0.3s ease;

    &--visible {
      opacity: 1;
    }

    img {
      display: block;
      max-width: 75vw;
      max-height: 80vh;
      object-fit: contain;
    }
  }
}

.image-gallery__spinner {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
