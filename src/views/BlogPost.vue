<template>
  <AppLayout>
    <div class="blog-post">
      <div v-if="!post" class="blog-post__not-found">
        <h1>文章不存在</h1>
        <router-link to="/blog">返回文章列表</router-link>
      </div>

      <article v-else class="blog-post__content">
        <header class="blog-post__header">
          <router-link to="/blog" class="blog-post__back">← 返回列表</router-link>
          <h1 class="blog-post__title">{{ post.title }}</h1>
          <div class="blog-post__meta">
            <time>{{ post.date }}</time>
            <div class="blog-post__tags">
              <span v-for="tag in post.tags" :key="tag" class="blog-post__tag">
                {{ tag }}
              </span>
            </div>
          </div>
        </header>

        <div class="blog-post__body" v-html="renderedContent" />
      </article>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Marked } from 'marked'
import DOMPurify from 'dompurify'
import AppLayout from '@/components/layout/AppLayout.vue'
import { blogPosts } from '@/data/blog-posts'
import type { BlogPost } from '@/types'

const route = useRoute()
const marked = new Marked()

const post = computed<BlogPost | undefined>(() => {
  return blogPosts.find((p) => p.id === route.params.id)
})

const renderedContent = computed<string>(() => {
  if (!post.value) return ''
  const raw = marked.parse(post.value.content) as string
  return DOMPurify.sanitize(raw)
})
</script>

<style lang="scss" scoped>
.blog-post {
  max-width: 800px;
  margin: 0 auto;

  &__not-found {
    text-align: center;
    padding: $spacing-3xl;

    h1 {
      font-size: $font-size-2xl;
      margin-bottom: $spacing-lg;
    }
  }

  &__back {
    display: inline-block;
    margin-bottom: $spacing-lg;
    color: $text-secondary;
    font-size: $font-size-sm;

    &:hover {
      color: $accent-primary;
    }
  }

  &__header {
    margin-bottom: $spacing-xl;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    margin-bottom: $spacing-md;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    color: $text-muted;
    font-size: $font-size-sm;
  }

  &__tags {
    display: flex;
    gap: $spacing-xs;
  }

  &__tag {
    padding: 2px 8px;
    border-radius: $radius-sm;
    background: rgba($accent-primary, 0.15);
    color: $accent-primary;
    font-size: $font-size-xs;
  }

  &__body {
    @include glass-card;
    line-height: 1.8;
    font-size: $font-size-base;
    color: $text-secondary;

    :deep(h1),
    :deep(h2),
    :deep(h3) {
      color: $text-primary;
      margin-top: $spacing-xl;
      margin-bottom: $spacing-md;
    }

    :deep(p) {
      margin-bottom: $spacing-md;
    }

    :deep(code) {
      background: rgba(0, 0, 0, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: $font-mono;
      font-size: $font-size-sm;
    }

    :deep(pre) {
      background: rgba(0, 0, 0, 0.05);
      padding: $spacing-md;
      border-radius: $radius-md;
      overflow-x: auto;
      margin-bottom: $spacing-md;

      code {
        background: none;
        padding: 0;
      }
    }

    :deep(blockquote) {
      border-left: 3px solid $accent-primary;
      padding-left: $spacing-md;
      margin: $spacing-md 0;
      color: $text-muted;
    }

    :deep(ul),
    :deep(ol) {
      padding-left: $spacing-xl;
      margin-bottom: $spacing-md;
    }

    :deep(hr) {
      border: none;
      border-top: 1px solid $border-color;
      margin: $spacing-xl 0;
    }

    :deep(a) {
      color: $accent-primary;
    }
  }
}
</style>
