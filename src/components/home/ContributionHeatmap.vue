<template>
  <div class="contrib glass-card">
    <div class="contrib__header">
      <span class="contrib__title">GitHub 贡献</span>
      <a
        :href="`https://github.com/${data?.user ?? 'LLsetnow'}`"
        target="_blank"
        rel="noopener noreferrer"
        class="contrib__total"
      >
        {{ data ? `近半年 ${data.total} 次` : '—' }}
      </a>
    </div>

    <div v-if="loading" class="contrib__state">加载中…</div>
    <div v-else-if="!weeks.length" class="contrib__state">暂无贡献数据</div>

    <div v-else class="contrib__chart">
      <!-- Month captions sit above the grid, each anchored to the week column
           in which that month's first day falls. -->
      <div class="contrib__months" :style="weekColumns">
        <span
          v-for="m in monthLabels"
          :key="m.key"
          class="contrib__month"
          :style="{ gridColumn: `${m.column} / span ${m.span}` }"
        >
          {{ m.label }}
        </span>
      </div>

      <div class="contrib__weekdays">
        <span>一</span>
        <span>三</span>
        <span>五</span>
      </div>

      <div class="contrib__grid" :style="weekColumns">
        <template v-for="(week, wi) in weeks" :key="wi">
          <span
            v-for="(day, di) in week"
            :key="di"
            class="contrib__cell"
            :class="day ? `contrib__cell--l${day.level}` : 'contrib__cell--pad'"
            :title="day ? `${day.date} · ${day.count} 次贡献` : undefined"
          />
        </template>
      </div>

      <div class="contrib__legend">
        <span>少</span>
        <span v-for="l in 5" :key="l" class="contrib__cell" :class="`contrib__cell--l${l - 1}`" />
        <span>多</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

interface Day {
  date: string
  count: number
  level: number
}

interface ContributionData {
  user: string
  updatedAt: string | null
  total: number
  days: Day[]
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const data = ref<ContributionData | null>(null)
const loading = ref(true)

const baseUrl = import.meta.env.BASE_URL || '/'

/**
 * Reshape the flat day list into GitHub's grid: one column per week, seven
 * rows for the days of the week starting Sunday. The first week is padded so
 * the range's opening day lands on its real weekday.
 */
const weeks = computed<(Day | null)[][]>(() => {
  const days = data.value?.days ?? []
  if (!days.length) return []

  const leadingBlanks = new Date(`${days[0].date}T00:00:00`).getDay()
  const cells: (Day | null)[] = [...Array<null>(leadingBlanks).fill(null), ...days]

  const out: (Day | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7)
    // Pad the final partial week so every column has seven rows.
    while (week.length < 7) week.push(null)
    out.push(week)
  }
  return out
})

/** Column count is data-driven — 52 or 53 weeks depending on where today falls. */
const weekColumns = computed(() => ({
  gridTemplateColumns: `repeat(${weeks.value.length}, 1fr)`,
}))

/**
 * One caption per month, spanning the weeks it covers. A month is labelled at
 * the first week that contains any of its days; runs shorter than two weeks are
 * dropped so captions can't collide at the edges.
 */
const monthLabels = computed(() => {
  const out: { key: string; label: string; column: number; span: number }[] = []
  let previous = -1

  weeks.value.forEach((week, index) => {
    const firstReal = week.find(Boolean)
    if (!firstReal) return
    const month = Number(firstReal.date.slice(5, 7)) - 1
    if (month === previous) return
    previous = month
    out.push({ key: firstReal.date.slice(0, 7), label: MONTH_LABELS[month], column: index + 1, span: 1 })
  })

  return out
    .map((entry, i) => ({
      ...entry,
      span: (out[i + 1]?.column ?? weeks.value.length + 1) - entry.column,
    }))
    .filter(entry => entry.span >= 2)
})

onMounted(async () => {
  try {
    const res = await fetch(`${baseUrl}contributions/contributions.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.contrib {
  @include glass-card;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $spacing-sm;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
  }

  &__total {
    font-size: $font-size-sm;
    color: $text-secondary;
    text-decoration: none;
    white-space: nowrap;
    transition: color $transition-fast;

    &:hover {
      color: $accent-primary;
    }
  }

  &__state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-muted;
    font-size: $font-size-sm;
  }

  // Weekday gutter on the left, month captions across the top; the legend
  // spans the full width beneath.
  &__chart {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto auto;
    gap: 4px 6px;
    align-content: start;
  }

  &__months {
    grid-column: 2;
    display: grid;
    // Column template is set inline so it always matches the week count.
    gap: 2px;
    min-width: 0;
    font-size: 10px;
    color: $text-muted;
    line-height: 1;
  }

  &__month {
    // Captions read from the left edge of the month's first week.
    justify-self: start;
    white-space: nowrap;
  }

  &__weekdays {
    grid-column: 1;
    grid-row: 2;
    display: grid;
    // Three captions over seven rows: rows 2, 4 and 6, as GitHub does.
    grid-template-rows: repeat(7, 1fr);
    gap: 2px;
    font-size: 10px;
    color: $text-muted;
    line-height: 1;

    span {
      display: flex;
      align-items: center;

      &:nth-child(1) { grid-row: 2; }
      &:nth-child(2) { grid-row: 4; }
      &:nth-child(3) { grid-row: 6; }
    }
  }

  &__grid {
    grid-column: 2;
    grid-row: 2;
    display: grid;
    grid-template-rows: repeat(7, 1fr);
    // Fill down each week before moving to the next.
    grid-auto-flow: column;
    gap: 2px;
    // Grid items default to min-width: auto and would otherwise refuse to
    // shrink below the columns' intrinsic width, overflowing the card.
    min-width: 0;
  }

  &__cell {
    aspect-ratio: 1;
    border-radius: 2px;

    &--pad {
      background: transparent;
    }

    // Ramp built from the site accent rather than GitHub's greens, so the
    // widget still reads as part of this page.
    &--l0 { background: rgba(255, 255, 255, 0.45); }
    &--l1 { background: rgba($accent-primary, 0.4); }
    &--l2 { background: rgba($accent-primary, 0.65); }
    &--l3 { background: rgba($accent-primary, 0.9); }
    &--l4 { background: $accent-secondary; }
  }

  &__legend {
    grid-column: 2;
    grid-row: 3;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    font-size: 10px;
    color: $text-muted;

    .contrib__cell {
      width: 9px;
      height: 9px;
      aspect-ratio: auto;
    }

    span:first-child { margin-right: 2px; }
    span:last-child { margin-left: 2px; }
  }
}
</style>
