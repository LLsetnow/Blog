<template>
  <AppLayout>
    <section class="blog-list">
      <header class="blog-list__hero glass-card">
        <div class="blog-list__hero-copy">
          <p class="blog-list__eyebrow">Markdown 博客</p>
          <h1 class="blog-list__title">博客文章</h1>
          <p class="blog-list__intro">
            本地演示：内容保存于此浏览器；线上安全密码和真正写入 .md 文件需要后端 API。
          </p>
        </div>

        <router-link to="/blog/new" class="blog-list__primary-action">
          新建文章
        </router-link>
      </header>

      <div v-if="posts.length === 0" class="blog-list__empty glass-card">
        <p>暂无文章</p>
        <router-link to="/blog/new" class="blog-list__primary-action">
          新建第一篇
        </router-link>
      </div>

      <div v-else class="blog-list__items">
        <article
          v-for="post in orderedPosts"
          :key="post.id"
          class="blog-list__item glass-card"
        >
          <div class="blog-list__item-header">
            <div class="blog-list__item-heading">
              <p class="blog-list__item-kicker">文章</p>
              <router-link :to="`/blog/${post.id}`" class="blog-list__item-title-link">
                <h2 class="blog-list__item-title">{{ post.title }}</h2>
              </router-link>
            </div>

            <router-link
              :to="`/blog/edit/${post.id}`"
              class="blog-list__item-edit"
              :aria-label="`编辑文章 ${post.title}`"
            >
              编辑
            </router-link>
          </div>

          <p class="blog-list__item-excerpt">
            {{ post.excerpt }}
          </p>

          <div class="blog-list__item-footer">
            <time class="blog-list__item-date">{{ post.date }}</time>
            <div v-if="post.tags.length" class="blog-list__item-tags" aria-label="标签">
              <span
                v-for="tag in post.tags"
                :key="tag"
                class="blog-list__item-tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useBlogPosts } from '@/composables/useBlogPosts'

const { posts } = useBlogPosts()

const orderedPosts = computed(() => {
  return [...posts.value].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date)
    return dateDiff !== 0 ? dateDiff : a.title.localeCompare(b.title)
  })
})
</script>

<style lang="scss" scoped>
.blog-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;

  &__hero {
    @include glass-card;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $spacing-lg;
    padding: $spacing-xl;
  }

  &__hero-copy {
    min-width: 0;
  }

  &__eyebrow {
    margin-bottom: $spacing-xs;
    color: $accent-primary;
    font-size: $font-size-sm;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__title {
    margin-bottom: $spacing-sm;
    font-size: $font-size-2xl;
    font-weight: 700;
  }

  &__intro {
    max-width: 720px;
    color: $text-secondary;
    line-height: 1.7;
  }

  &__primary-action {
    align-self: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 $spacing-lg;
    border-radius: $radius-lg;
    background: rgba($accent-primary, 0.16);
    color: $text-primary;
    font-size: $font-size-sm;
    font-weight: 600;
    text-decoration: none;
    transition:
      transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
      background-color 180ms cubic-bezier(0.23, 1, 0.32, 1),
      color 180ms cubic-bezier(0.23, 1, 0.32, 1);

    &:hover,
    &:focus-visible {
      background: rgba($accent-primary, 0.24);
      color: $accent-primary;
      transform: translateY(-1px);
    }
  }

  &__empty {
    @include glass-card;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-lg;
    padding: $spacing-2xl;
    color: $text-secondary;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }

  &__item {
    @include glass-card;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    padding: $spacing-xl;
  }

  &__item-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $spacing-md;
  }

  &__item-heading {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  &__item-kicker {
    color: $accent-primary;
    font-size: $font-size-xs;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__item-title-link {
    color: inherit;
    text-decoration: none;
  }

  &__item-title {
    font-size: $font-size-xl;
    font-weight: 700;
    color: $text-primary;
    transition: color 180ms cubic-bezier(0.23, 1, 0.32, 1);

    &:hover,
    &:focus-visible {
      color: $accent-primary;
    }
  }

  &__item-edit {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0 $spacing-md;
    border-radius: $radius-md;
    background: rgba(255, 255, 255, 0.22);
    color: $text-primary;
    font-size: $font-size-sm;
    font-weight: 600;
    text-decoration: none;
    transition:
      transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
      background-color 180ms cubic-bezier(0.23, 1, 0.32, 1),
      color 180ms cubic-bezier(0.23, 1, 0.32, 1);

    &:hover,
    &:focus-visible {
      background: rgba($accent-primary, 0.16);
      color: $accent-primary;
      transform: translateY(-1px);
    }
  }

  &__item-excerpt {
    color: $text-secondary;
    font-size: $font-size-base;
    line-height: 1.7;
  }

  &__item-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    flex-wrap: wrap;
  }

  &__item-date {
    color: $text-muted;
    font-size: $font-size-sm;
  }

  &__item-tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &__item-tag {
    padding: 2px 8px;
    border-radius: $radius-sm;
    background: rgba($accent-primary, 0.15);
    color: $accent-primary;
    font-size: $font-size-xs;
  }
}

@media (max-width: 767px) {
  .blog-list {
    &__hero,
    &__empty,
    &__item {
      padding: $spacing-lg;
    }

    &__hero,
    &__item-header,
    &__empty {
      flex-direction: column;
      align-items: stretch;
    }

    &__primary-action,
    &__item-edit {
      width: 100%;
    }
  }
}
</style>
