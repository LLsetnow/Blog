<template>
  <a
    href="https://space.bilibili.com/39493006"
    target="_blank"
    rel="noopener noreferrer"
    class="bilibili-widget glass-card"
    aria-label="Bilibili 主页"
  >
    <span class="bilibili-widget__icon">
      <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.746v7.5A3.75 3.75 0 0 1 18.25 21H5.75A3.75 3.75 0 0 1 2 17.246v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.17L5.777 4.854a1.25 1.25 0 1 1 1.767-1.768l2.652 2.652c.079.079.145.164.198.254h3.213c.053-.09.12-.175.198-.254l2.651-2.652a1.25 1.25 0 0 1 1.768 0zm.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.093v7.5a1.25 1.25 0 0 0 1.157 1.247l.093.003h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5a1.25 1.25 0 0 0-1.25-1.25zm-10 2.5a1.25 1.25 0 0 1 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25a1.25 1.25 0 0 1 1.25-1.25zm7.5 0a1.25 1.25 0 0 1 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25a1.25 1.25 0 0 1 1.25-1.25z"/>
      </svg>
    </span>
  </a>
</template>

<style lang="scss" scoped>
.bilibili-widget {
  @include glass-card;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  // Solid rather than the brand gradient: this sits in a row of single-colour
  // icons (GitHub, email, WeChat) and a gradient would break that rhythm.
  color: $bilibili-pink;
  cursor: pointer;
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;

  &:hover {
    color: $bilibili-blue;
    opacity: 0.85;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: inherit;
  }
}
</style>
