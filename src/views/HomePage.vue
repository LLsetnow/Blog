<template>
  <div class="home-page">
    <div class="home-page__container">
      <!-- Row 1: Greeting (2fr) | Clock (1fr) -->
      <div class="home-page__row home-page__row--1">
        <div class="home-page__cell home-page__cell--greeting">
          <TiltEffect>
            <GreetingCard />
          </TiltEffect>
        </div>
        <div class="home-page__cell home-page__cell--clock">
          <TiltEffect>
            <ClockWidget />
          </TiltEffect>
        </div>
      </div>

      <!-- Row 2: Calendar (full width) -->
      <div class="home-page__row home-page__row--2">
        <div class="home-page__cell home-page__cell--calendar">
          <TiltEffect>
            <CalendarWidget />
          </TiltEffect>
        </div>
      </div>

      <!-- Row 3: Music (full width) -->
      <div class="home-page__row home-page__row--3">
        <div class="home-page__cell home-page__cell--music">
          <TiltEffect>
            <MusicPlayer />
          </TiltEffect>
        </div>
      </div>

      <!-- Row 4: Gallery (2fr) | Nav (1fr) -->
      <div class="home-page__row home-page__row--4">
        <div class="home-page__cell home-page__cell--gallery">
          <TiltEffect>
            <ImageGallery />
          </TiltEffect>
        </div>
        <div class="home-page__cell home-page__cell--nav">
          <TiltEffect>
            <NavMenu />
          </TiltEffect>
        </div>
      </div>

      <!-- Row 5: GitHub (centered) -->
      <div class="home-page__row home-page__row--5">
        <div class="home-page__cell home-page__cell--github">
          <TiltEffect>
            <GitHubCard />
          </TiltEffect>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TiltEffect from '@/components/common/TiltEffect.vue'
import GreetingCard from '@/components/home/GreetingCard.vue'
import ClockWidget from '@/components/home/ClockWidget.vue'
import MusicPlayer from '@/components/home/MusicPlayer.vue'
import CalendarWidget from '@/components/home/CalendarWidget.vue'
import NavMenu from '@/components/home/NavMenu.vue'
import GitHubCard from '@/components/home/GitHubCard.vue'
import ImageGallery from '@/components/home/ImageGallery.vue'
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: $bg-gradient;
  background-attachment: fixed;

  &__container {
    max-width: 960px;
    margin: 0 auto;
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  &__row {
    display: grid;
    gap: 24px;

    &--1 {
      grid-template-columns: 2fr 1fr;
    }

    &--2 {
      grid-template-columns: 1fr;
    }

    &--3 {
      grid-template-columns: 1fr;
    }

    &--4 {
      grid-template-columns: 2fr 1fr;
    }

    &--5 {
      grid-template-columns: 1fr;
      justify-items: center;

      .home-page__cell--github {
        max-width: 360px;
        width: 100%;
      }
    }
  }

  &__cell {
    display: flex;
  }

  @media (max-width: $breakpoint-md) {
    &__row {
      grid-template-columns: 1fr;
    }
  }
}
</style>
