<template>
  <div class="calendar-widget glass-card">
    <div class="calendar-widget__header">
      <button class="calendar-widget__nav" @click="prevMonth">&lt;</button>
      <span class="calendar-widget__title">{{ year }}年{{ month }}月</span>
      <button class="calendar-widget__nav" @click="nextMonth">&gt;</button>
    </div>

    <div class="calendar-widget__weekdays">
      <span v-for="day in weekdays" :key="day" class="calendar-widget__weekday">
        {{ day }}
      </span>
    </div>

    <div class="calendar-widget__days">
      <span
        v-for="(day, index) in days"
        :key="index"
        class="calendar-widget__day"
        :class="{
          'calendar-widget__day--today': day.isToday,
          'calendar-widget__day--other': !day.isCurrentMonth,
        }"
      >
        {{ day.day }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CalendarDay } from '@/types'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const today = new Date()
const year = ref(today.getFullYear())
const month = ref(today.getMonth() + 1)

function prevMonth(): void {
  if (month.value === 1) {
    month.value = 12
    year.value--
  } else {
    month.value--
  }
}

function nextMonth(): void {
  if (month.value === 12) {
    month.value = 1
    year.value++
  } else {
    month.value++
  }
}

const days = computed<CalendarDay[]>(() => {
  const result: CalendarDay[] = []
  const firstDay = new Date(year.value, month.value - 1, 1)
  const lastDay = new Date(year.value, month.value, 0)
  const startDayOfWeek = firstDay.getDay()

  // Previous month padding
  const prevLastDay = new Date(year.value, month.value - 1, 0)
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    result.push({
      year: prevLastDay.getFullYear(),
      month: prevLastDay.getMonth() + 1,
      day: prevLastDay.getDate() - i,
      isToday: false,
      isCurrentMonth: false,
    })
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    result.push({
      year: year.value,
      month: month.value,
      day: i,
      isToday:
        i === today.getDate() &&
        month.value === today.getMonth() + 1 &&
        year.value === today.getFullYear(),
      isCurrentMonth: true,
    })
  }

  // Next month padding to fill 6 rows
  const remaining = 42 - result.length
  for (let i = 1; i <= remaining; i++) {
    const nextMonthDate = new Date(year.value, month.value, i)
    result.push({
      year: nextMonthDate.getFullYear(),
      month: nextMonthDate.getMonth() + 1,
      day: i,
      isToday: false,
      isCurrentMonth: false,
    })
  }

  return result
})
</script>

<style lang="scss" scoped>
.calendar-widget {
  @include glass-card;
  width: 100%;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-md;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: 600;
  }

  &__nav {
    background: transparent;
    border: none;
    color: $text-secondary;
    cursor: pointer;
    font-size: $font-size-base;
    padding: 4px 8px;
    transition: color $transition-fast;
    line-height: 1;

    &:hover {
      color: $text-primary;
    }
  }

  &__weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: $spacing-sm;
  }

  &__weekday {
    text-align: center;
    font-size: $font-size-base;
    color: $text-muted;
    padding: 8px 0;
  }

  &__days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  &__day {
    text-align: center;
    padding: 10px 0;
    font-size: $font-size-base;
    border-radius: $radius-sm;
    cursor: default;

    &--other {
      color: $text-muted;
      opacity: 0.4;
    }

    &--today {
      background: #7ec8e3;
      color: #fff;
      font-weight: 600;
    }
  }
}
</style>
