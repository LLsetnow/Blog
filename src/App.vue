<template>
  <router-view />

  <!-- Non-home pages: floating mini player with animation -->
  <Transition name="player-float">
    <div v-if="!isHome" class="player-float">
      <MusicPlayer mini />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MusicPlayer from '@/components/home/MusicPlayer.vue'

const route = useRoute()
const isHome = computed(() => route.path === '/')
</script>

<style lang="scss" scoped>
.player-float {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

// Transition: slide up + fade
.player-float-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.player-float-leave-active {
  transition: all 0.2s ease;
}

.player-float-enter-from,
.player-float-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.9);
}
</style>
