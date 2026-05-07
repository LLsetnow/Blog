<template>
  <router-view />
  <div class="global-player">
    <MusicPlayer global />
  </div>
</template>

<script setup lang="ts">
import MusicPlayer from '@/components/home/MusicPlayer.vue'
</script>

<style lang="scss" scoped>
.global-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: $z-sticky;
}
</style>
