<template>
  <div class="image-gallery glass-card">
    <div class="image-gallery__grid">
      <div
        v-for="(img, index) in images"
        :key="index"
        class="image-gallery__item"
        @click="openPreview(index)"
      >
        <img :src="img.thumb" :alt="img.alt" loading="lazy" />
      </div>
    </div>

    <!-- Lightbox overlay -->
    <Teleport to="body">
      <div
        v-if="previewIndex !== null"
        class="image-gallery__preview"
        @click="closePreview"
      >
        <div
          ref="previewRef"
          class="image-gallery__preview-image"
          @mousemove="onPreviewMouseMove"
          @mouseleave="onPreviewMouseLeave"
          @click.stop
        >
          <img :src="images[previewIndex].full" :alt="images[previewIndex].alt" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface GalleryImage {
  thumb: string
  full: string
  alt: string
}

const images: GalleryImage[] = [
  { thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop', full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=900&fit=crop', alt: 'Mountains' },
  { thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop', full: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=900&fit=crop', alt: 'Beach' },
  { thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&h=200&fit=crop', full: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=900&fit=crop', alt: 'Stars' },
  { thumb: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=200&fit=crop', full: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=900&fit=crop', alt: 'Forest' },
  { thumb: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=200&fit=crop', full: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=900&fit=crop', alt: 'Trees' },
  { thumb: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&h=200&fit=crop', full: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&h=900&fit=crop', alt: 'Ocean' },
  { thumb: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=200&fit=crop', full: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=900&fit=crop', alt: 'Sunset' },
  { thumb: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200&h=200&fit=crop', full: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&h=900&fit=crop', alt: 'Waterfall' },
]

const previewIndex = ref<number | null>(null)
const previewRef = ref<HTMLElement | null>(null)

function openPreview(index: number) {
  previewIndex.value = index
}

function closePreview() {
  previewIndex.value = null
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

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    &:hover img {
      transform: scale(1.1);
    }
  }
}

// Lightbox overlay (Teleported to body, styles not scoped to the gallery)
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

    img {
      display: block;
      max-width: 75vw;
      max-height: 80vh;
      object-fit: contain;
    }
  }
}
</style>
