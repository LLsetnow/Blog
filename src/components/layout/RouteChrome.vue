<template>
  <div class="route-chrome">
    <router-link to="/" class="route-chrome__brand">Akai's Blog</router-link>

    <nav class="route-chrome__task-rail" aria-label="主要导航">
      <router-link
        to="/"
        class="route-chrome__task-card"
        active-class="route-chrome__task-card--active"
        exact-active-class="route-chrome__task-card--exact-active"
        aria-label="首页"
      >
        <span class="route-chrome__task-content">
          <svg class="route-chrome__task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6" />
          </svg>
          <span class="route-chrome__task-label">首页</span>
        </span>
      </router-link>

      <router-link to="/blog" class="route-chrome__task-card" aria-label="博客">
        <span class="route-chrome__task-content">
          <svg class="route-chrome__task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span class="route-chrome__task-label">博客</span>
        </span>
      </router-link>

      <router-link to="/projects" class="route-chrome__task-card" aria-label="项目">
        <span class="route-chrome__task-content">
          <svg class="route-chrome__task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span class="route-chrome__task-label">项目</span>
        </span>
      </router-link>

      <router-link to="/news" class="route-chrome__task-card" aria-label="新闻">
        <span class="route-chrome__task-content">
          <svg class="route-chrome__task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" />
          </svg>
          <span class="route-chrome__task-label">新闻</span>
        </span>
      </router-link>

      <router-link to="/about" class="route-chrome__task-card" aria-label="关于">
        <span class="route-chrome__task-content">
          <svg class="route-chrome__task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span class="route-chrome__task-label">关于</span>
        </span>
      </router-link>

      <router-link to="/favorites" class="route-chrome__task-card" aria-label="收藏">
        <span class="route-chrome__task-content">
          <svg class="route-chrome__task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span class="route-chrome__task-label">收藏</span>
        </span>
      </router-link>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
.route-chrome {
  &__brand {
    position: fixed;
    top: 22px;
    left: 24px;
    z-index: 30;
    color: $text-primary;
    font-size: $font-size-lg;
    font-weight: 700;
    line-height: 1;
    text-decoration: none;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    &:focus-visible {
      border-radius: 6px;
      outline: 3px solid #167d9c;
      outline-offset: 5px;
      box-shadow: none;
    }
  }

  &__task-rail {
    position: fixed;
    top: 50%;
    right: 18px;
    z-index: 30;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    width: 154px;
    transform: translateY(-50%);
  }

  &__task-card {
    --task-rotate: 0deg;
    --task-skew: 0deg;
    --task-offset: 0px;

    display: flex;
    width: 66px;
    height: 60px;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: #18343c;
    text-decoration: none;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    box-shadow:
      inset 0 0 0 2px rgba(255, 255, 255, 0.65),
      0 6px 18px rgba(33, 89, 105, 0.14);
    transform: translateX(var(--task-offset)) rotate(var(--task-rotate)) skewX(var(--task-skew));
    transform-origin: right center;
    transition:
      width 220ms ease,
      height 220ms ease,
      box-shadow 180ms ease,
      transform 220ms ease;

    &:nth-child(1) {
      --task-rotate: -1.6deg;
      --task-skew: 0.8deg;
      --task-offset: -5px;
    }

    &:nth-child(2) {
      --task-rotate: 1.2deg;
      --task-skew: -0.7deg;
      --task-offset: 2px;
    }

    &:nth-child(3) {
      --task-rotate: -0.8deg;
      --task-skew: 1.1deg;
      --task-offset: -2px;
    }

    &:nth-child(4) {
      --task-rotate: 1.8deg;
      --task-skew: -0.9deg;
      --task-offset: 5px;
    }

    &:nth-child(5) {
      --task-rotate: -1.2deg;
      --task-skew: 0.6deg;
      --task-offset: 1px;
    }

    &:nth-child(6) {
      --task-rotate: 0.9deg;
      --task-skew: -1.2deg;
      --task-offset: -4px;
    }

    &:hover {
      width: 116px;
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.8),
        0 9px 22px rgba(33, 89, 105, 0.2);
    }

    &:focus-visible {
      outline: none;
      outline-offset: 0;
    }

    &.router-link-active,
    &.route-chrome__task-card--exact-active {
      width: 150px;
      height: 72px;
      background: transparent;
      box-shadow:
        inset 0 0 0 2px rgba(255, 255, 255, 0.8),
        0 12px 28px rgba(25, 91, 111, 0.32);
    }

    &:hover .route-chrome__task-label,
    &:focus-visible .route-chrome__task-label,
    &.router-link-active .route-chrome__task-label,
    &.route-chrome__task-card--exact-active .route-chrome__task-label {
      max-width: 64px;
      margin-left: 10px;
      opacity: 1;
      transform: translateX(0);
    }
  }

  &__task-content {
    display: flex;
    align-items: center;
    justify-content: center;
    transform: skewX(calc(var(--task-skew) * -1)) rotate(calc(var(--task-rotate) * -1));
  }

  &__task-icon {
    width: 25px;
    height: 25px;
    flex: 0 0 25px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__task-label {
    max-width: 0;
    overflow: hidden;
    color: #18343c;
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    opacity: 0;
    transform: translateX(8px);
    transition:
      max-width 220ms ease,
      margin-left 220ms ease,
      opacity 140ms ease,
      transform 220ms ease;
  }
}

@media (max-width: 767px) {
  .route-chrome {
    &__brand {
      top: 18px;
      left: 16px;
    }

    &__task-rail {
      top: auto;
      right: 8px;
      bottom: 8px;
      left: 8px;
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 4px;
      width: auto;
      padding: 5px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(33, 89, 105, 0.2);
      transform: none;
    }

    &__task-card,
    &__task-card:hover,
    &__task-card:focus-visible {
      width: 100%;
      min-width: 0;
      height: 54px;
      min-height: 44px;
      background: transparent;
      border-color: transparent;
      box-shadow:
        inset 0 0 0 2px rgba(255, 255, 255, 0.65),
        0 5px 12px rgba(33, 89, 105, 0.14);
      transform: none;
    }

    &__task-card:hover {
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.8),
        0 5px 12px rgba(33, 89, 105, 0.14);
    }

    &__task-card.router-link-active,
    &__task-card.route-chrome__task-card--exact-active {
      width: 100%;
      min-width: 0;
      height: 54px;
      min-height: 44px;
      background: transparent;
      border-color: transparent;
      box-shadow:
        inset 0 0 0 2px rgba(255, 255, 255, 0.8),
        0 8px 18px rgba(25, 91, 111, 0.26);
      transform: none;
    }

    &__task-content {
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      transform: none;
    }

    &__task-icon {
      width: 21px;
      height: 21px;
      flex-basis: 21px;
    }

    &__task-label,
    &__task-card:hover .route-chrome__task-label,
    &__task-card:focus-visible .route-chrome__task-label,
    &__task-card.router-link-active .route-chrome__task-label,
    &__task-card.route-chrome__task-card--exact-active .route-chrome__task-label {
      max-width: 100%;
      margin-left: 0;
      overflow: visible;
      font-size: 10px;
      opacity: 1;
      transform: none;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-chrome__task-card,
  .route-chrome__task-label {
    transition: none;
  }
}
</style>
