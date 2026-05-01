<template>
  <div class="image-gallery glass-card">
    <h3 class="image-gallery__title">图库</h3>
    <div class="image-gallery__grid">
      <div
        v-for="(img, index) in images"
        :key="index"
        class="image-gallery__item"
      >
        <img :src="img.src" :alt="img.alt" loading="lazy" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface GalleryImage {
  src: string
  alt: string
}

const images: GalleryImage[] = [
  { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop', alt: 'Mountains' },
  { src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop', alt: 'Beach' },
  { src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&h=200&fit=crop', alt: 'Stars' },
  { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=200&fit=crop', alt: 'Forest' },
  { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=200&fit=crop', alt: 'Trees' },
  { src: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&h=200&fit=crop', alt: 'Ocean' },
  { src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=200&fit=crop', alt: 'Sunset' },
  { src: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200&h=200&fit=crop', alt: 'Waterfall' },
]
</script>

<style lang="scss" scoped>
.image-gallery {
  @include glass-card;
  width: 100%;

  &__title {
    font-size: $font-size-base;
    font-weight: 600;
    margin-bottom: $spacing-md;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  &__item {
    border-radius: $radius-sm;
    overflow: hidden;
    aspect-ratio: 1;
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
</style>
