<template>
  <section class="cron-tasks glass-card" aria-labelledby="cron-tasks-title">
    <div class="cron-tasks__header">
      <h2 id="cron-tasks-title" class="cron-tasks__title">定时任务</h2>
      <span class="cron-tasks__source">systemd timer</span>
    </div>

    <ul class="cron-tasks__list" aria-label="定时任务列表">
      <li v-for="task in tasks" :key="task.id" class="cron-tasks__row">
        <span class="cron-tasks__indicator" aria-hidden="true" />
        <div class="cron-tasks__details">
          <span class="cron-tasks__name">{{ task.name }}</span>
          <span class="cron-tasks__frequency">{{ task.frequency }}（{{ task.timezone }}）</span>
        </div>
        <span class="cron-tasks__status">{{ task.status }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
interface ScheduledTask {
  id: string
  name: string
  frequency: string
  timezone: string
  status: string
}

/** Static, server-verified task metadata; this card does not probe the server. */
const tasks: readonly ScheduledTask[] = [
  {
    id: 'blog-news-update',
    name: '每日新闻更新',
    frequency: '每天 11:00',
    timezone: '北京时间',
    status: '已启用',
  },
]
</script>

<style lang="scss" scoped>
.cron-tasks {
  @include glass-card($radius-soft);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
  }

  &__title {
    margin: 0;
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }

  &__source {
    flex-shrink: 0;
    font-family: $font-mono;
    font-size: 10px;
    color: $text-muted;
    white-space: nowrap;
  }

  &__list {
    flex: 1;
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
    min-height: 0;
  }

  &__row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    min-width: 0;
  }

  &__indicator {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #38c793;
    box-shadow: 0 0 0 3px rgba(56, 199, 147, 0.22);
  }

  &__details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    min-width: 0;
  }

  &__name,
  &__frequency {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__name {
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__frequency {
    font-size: $font-size-xs;
    color: $text-muted;
  }

  &__status {
    flex-shrink: 0;
    font-size: $font-size-xs;
    color: #2eaa7b;
    white-space: nowrap;
  }
}
</style>
