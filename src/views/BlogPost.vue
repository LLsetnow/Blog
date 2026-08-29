<template>
  <AppLayout>
    <div class="blog-post">
      <div v-if="isPostsLoading" class="blog-post__not-found glass-card">
        <p>正在加载文章…</p>
      </div>

      <div v-else-if="!post" class="blog-post__not-found glass-card">
        <h1>文章不存在</h1>
        <p>{{ postsError || '这篇文章可能还没有发布。' }}</p>
        <div class="blog-post__not-found-actions">
          <router-link to="/blog" class="blog-post__action">返回文章列表</router-link>
          <router-link to="/blog/new" class="blog-post__action blog-post__action--primary">新建文章</router-link>
        </div>
      </div>

      <article v-else class="blog-post__content">
        <header class="blog-post__header glass-card">
          <div class="blog-post__header-top">
            <router-link to="/blog" class="blog-post__back">← 返回列表</router-link>
            <router-link :to="`/blog/edit/${post.id}`" class="blog-post__edit">
              编辑文章
            </router-link>
          </div>

          <div class="blog-post__hero">
            <p class="blog-post__eyebrow">Markdown 文章</p>
            <h1 class="blog-post__title">{{ post.title }}</h1>
            <p class="blog-post__excerpt">{{ post.excerpt }}</p>
          </div>

          <div class="blog-post__meta">
            <time>{{ post.date }}</time>
            <div v-if="post.tags.length" class="blog-post__tags" aria-label="标签">
              <span v-for="tag in post.tags" :key="tag" class="blog-post__tag">
                {{ tag }}
              </span>
            </div>
          </div>
        </header>

        <div class="blog-post__body glass-card" v-html="renderedContent" />
      </article>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Marked } from 'marked'
import DOMPurify from 'dompurify'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useBlogPosts } from '@/composables/useBlogPosts'
import type { BlogPost } from '@/types'

const route = useRoute()
const marked = new Marked()
const { getPost, isPostsLoading, postsError, loadPosts } = useBlogPosts()

const post = computed<BlogPost | undefined>(() => {
  return typeof route.params.id === 'string' ? getPost(route.params.id) : undefined
})

const renderedContent = computed<string>(() => {
  if (!post.value) return ''

  const raw = marked.parse(post.value.content) as string
  return DOMPurify.sanitize(raw)
})

onMounted(() => {
  void loadPosts()
})
</script>

<style lang="scss" scoped>
.blog-post {
  max-width: 880px;
  margin: 0 auto;

  &__not-found {
    @include glass-card;
    text-align: center;
    padding: $spacing-3xl;

    h1 {
      font-size: $font-size-2xl;
      margin-bottom: $spacing-sm;
    }

    p {
      color: $text-secondary;
    }
  }

  &__not-found-actions {
    display: flex;
    justify-content: center;
    gap: $spacing-md;
    margin-top: $spacing-lg;
    flex-wrap: wrap;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 $spacing-lg;
    border-radius: $radius-lg;
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

    &--primary {
      background: rgba($accent-primary, 0.18);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }

  &__header {
    @include glass-card;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    padding: $spacing-xl;
  }

  &__header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
  }

  &__back,
  &__edit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0 $spacing-md;
    border-radius: $radius-md;
    background: rgba(255, 255, 255, 0.18);
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

  &__hero {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  &__eyebrow {
    color: $accent-primary;
    font-size: $font-size-sm;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    color: $text-primary;
  }

  &__excerpt {
    color: $text-secondary;
    line-height: 1.7;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    flex-wrap: wrap;
    color: $text-muted;
    font-size: $font-size-sm;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
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
    padding: $spacing-xl;

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

@media (max-width: 767px) {
  .blog-post {
    &__header,
    &__body,
    &__not-found {
      padding: $spacing-lg;
    }

    &__header-top,
    &__meta,
    &__not-found-actions {
      flex-direction: column;
      align-items: stretch;
    }

    &__back,
    &__edit,
    &__action {
      width: 100%;
    }
  }
}
</style>
