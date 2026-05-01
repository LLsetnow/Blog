<template>
  <AppLayout>
    <div class="blog-list">
      <h1 class="blog-list__title">博客文章</h1>

      <div v-if="posts.length === 0" class="blog-list__empty">
        <p>暂无文章</p>
      </div>

      <div v-else class="blog-list__items">
        <article
          v-for="post in posts"
          :key="post.id"
          class="blog-list__item glass-card"
        >
          <router-link :to="`/blog/${post.id}`" class="blog-list__item-link">
            <h2 class="blog-list__item-title">{{ post.title }}</h2>
            <p class="blog-list__item-excerpt">{{ post.excerpt }}</p>
            <div class="blog-list__item-meta">
              <time class="blog-list__item-date">{{ post.date }}</time>
              <div class="blog-list__item-tags">
                <span
                  v-for="tag in post.tags"
                  :key="tag"
                  class="blog-list__item-tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </router-link>
        </article>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import { blogPosts } from '@/data/blog-posts'
import type { BlogPost } from '@/types'

const posts: BlogPost[] = blogPosts
</script>

<style lang="scss" scoped>
.blog-list {
  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    margin-bottom: $spacing-xl;
  }

  &__empty {
    text-align: center;
    padding: $spacing-3xl;
    color: $text-muted;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }

  &__item {
    @include glass-card;
    cursor: pointer;
  }

  &__item-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  &__item-title {
    font-size: $font-size-xl;
    font-weight: 600;
    margin-bottom: $spacing-sm;
    color: $text-primary;
    transition: color $transition-fast;

    &:hover {
      color: $accent-primary;
    }
  }

  &__item-excerpt {
    color: $text-secondary;
    font-size: $font-size-base;
    line-height: 1.6;
    margin-bottom: $spacing-md;
  }

  &__item-meta {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  &__item-date {
    color: $text-muted;
    font-size: $font-size-sm;
  }

  &__item-tags {
    display: flex;
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
</style>
