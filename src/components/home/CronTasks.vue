<template>
  <section class="cron-tasks glass-card" aria-labelledby="cron-tasks-title">
    <div class="cron-tasks__header">
      <h2 id="cron-tasks-title" class="cron-tasks__title">定时任务</h2>
      <span class="cron-tasks__source">systemd timer</span>
    </div>

    <ul class="cron-tasks__list" aria-label="定时任务列表">
      <li v-for="task in tasks" :key="task.id" class="cron-tasks__row">
        <span class="cron-tasks__indicator" aria-hidden="true" />
        <span class="cron-tasks__name">{{ task.name }}</span>
        <span
          class="cron-tasks__frequency"
          :aria-label="`${task.frequency}（${task.timezone}）`"
        >{{ task.frequency }}（{{ task.timezone }}）</span>
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
}

/** Static, server-verified task metadata; this card does not probe the server. */
const tasks: readonly ScheduledTask[] = [
  {
    id: 'blog-news-update',
    name: '每日新闻更新',
    frequency: '每天 11:00',
    timezone: '北京时间',
  },
  {
    id: 'blog-projects-update',
    name: '项目数据更新',
    frequency: '每周日 11:30',
    timezone: '北京时间',
  },
  {
    id: 'blog-favorites-update',
    name: '收藏数据更新',
    frequency: '每周日 12:00',
    timezone: '北京时间',
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
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

  &__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  &__frequency {
    flex: 0 1 48%;
    min-width: 0;
    overflow: hidden;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: $font-size-xs;
    color: $text-muted;
  }
}
</style>
