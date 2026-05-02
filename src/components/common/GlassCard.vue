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
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.8),
      inset 0 0 14px 4px rgba(255, 255, 255, 0.2),
      0 12px 40px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
  }
}
</style>
