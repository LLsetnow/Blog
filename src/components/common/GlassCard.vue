<template>
  <div class="glass-card" :class="{ 'glass-card--hover': hoverable }">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface GlassCardProps {
  hoverable?: boolean
}

withDefaults(defineProps<GlassCardProps>(), {
  hoverable: false,
})
</script>

<style lang="scss" scoped>
.glass-card {
  @include glass;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  transition: all $transition-base;

  &--hover:hover {
    background: $bg-card-hover;
    border-color: rgba(255, 255, 255, 0.7);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  }
}
</style>
