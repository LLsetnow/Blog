<template>
  <AppLayout>
    <section class="blog-editor">
      <header class="blog-editor__hero glass-card">
        <div class="blog-editor__hero-copy">
          <p class="blog-editor__eyebrow">Markdown 博客编辑器</p>
          <h1 class="blog-editor__title">
            {{ isEditing ? '编辑文章' : '新建文章' }}
          </h1>
          <p class="blog-editor__intro">
            通过服务器会话保护编辑权限，Markdown 内容由服务端安全写入文章文件。
          </p>
        </div>

        <div class="blog-editor__hero-actions">
          <router-link to="/blog" class="blog-editor__secondary-action">
            返回列表
          </router-link>
          <button
            v-if="isUnlocked"
            type="button"
            class="blog-editor__secondary-action"
            @click="lockEditor"
          >
            退出编辑
          </button>
        </div>
      </header>

      <div v-if="!isUnlocked" class="blog-editor__gate glass-card">
        <div class="blog-editor__gate-copy">
          <h2 class="blog-editor__section-title">输入匹配密码解锁</h2>
          <p class="blog-editor__gate-note">
            密码只会通过 HTTPS 提交给服务器校验，不会写入浏览器存储；解锁后使用安全会话 Cookie。
          </p>
        </div>

        <form class="blog-editor__gate-form" @submit.prevent="unlockEditor">
          <label class="blog-editor__field blog-editor__field--full">
            <span class="blog-editor__label">编辑密码</span>
            <input
              ref="passwordInputRef"
              v-model="passwordInput"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
            >
          </label>

          <p v-if="passwordError" class="blog-editor__field-error">
            {{ passwordError }}
          </p>

          <button type="submit" class="blog-editor__primary-action" :disabled="isAuthLoading">
            {{ isAuthLoading ? '正在验证…' : '解锁编辑器' }}
          </button>
        </form>
      </div>

      <div v-else class="blog-editor__workspace">
        <aside class="blog-editor__notice glass-card">
          <div class="blog-editor__notice-copy">
            <strong>服务端安全编辑模式</strong>
            <p>
              内容写入服务器 Markdown 文件；会话、CSRF 校验和文章字段验证均由服务端处理。
            </p>
          </div>
          <div class="blog-editor__notice-badge">
            {{ isEditing ? `正在编辑 ${currentId || '未知文章'}` : '新建文章' }}
          </div>
        </aside>

        <div v-if="isPostsLoading" class="blog-editor__error glass-card">
          <h2>正在加载文章</h2>
          <p>正在从博客服务读取 Markdown 内容…</p>
        </div>

        <div v-else-if="loadError" class="blog-editor__error glass-card">
          <h2>文章不存在</h2>
          <p>{{ loadError }}</p>
          <div class="blog-editor__error-actions">
            <router-link to="/blog" class="blog-editor__secondary-action">
              返回列表
            </router-link>
            <router-link to="/blog/new" class="blog-editor__primary-action">
              新建文章
            </router-link>
          </div>
        </div>

        <div v-else class="blog-editor__layout">
          <form class="blog-editor__form glass-card" @submit.prevent="saveDraft">
            <h2 class="blog-editor__section-title">文章信息</h2>

            <div class="blog-editor__fields">
              <label class="blog-editor__field blog-editor__field--full">
                <span class="blog-editor__label">标题</span>
                <input
                  v-model="draft.title"
                  type="text"
                  placeholder="输入文章标题"
                  autocomplete="off"
                >
              </label>

              <label class="blog-editor__field">
                <span class="blog-editor__label">Slug / ID</span>
                <input
                  v-model="draft.id"
                  type="text"
                  :readonly="isEditing"
                  placeholder="根据标题自动生成"
                  autocomplete="off"
                  @input="onSlugInput"
                >
                <span class="blog-editor__hint">
                  {{ isEditing ? '编辑已有文章时 slug 已锁定，避免路由失效。' : '新建时可手动修改，标题变更前会自动建议 slug。' }}
                </span>
              </label>

              <label class="blog-editor__field">
                <span class="blog-editor__label">日期</span>
                <input
                  v-model="draft.date"
                  type="date"
                >
              </label>

              <label class="blog-editor__field blog-editor__field--full">
                <span class="blog-editor__label">摘要</span>
                <textarea
                  v-model="draft.excerpt"
                  rows="3"
                  placeholder="用于文章列表的简短摘要"
                />
              </label>

              <div class="blog-editor__field blog-editor__field--full">
                <span class="blog-editor__label">标签</span>
                <div class="blog-editor__tag-row">
                  <input
                    v-model="newTag"
                    type="text"
                    placeholder="输入标签后点击添加"
                    autocomplete="off"
                    @keydown.enter.prevent="addTag"
                  >
                  <button type="button" class="blog-editor__secondary-action" @click="addTag">
                    添加标签
                  </button>
                </div>

                <div v-if="draft.tags.length" class="blog-editor__tags" aria-label="已添加标签">
                  <span
                    v-for="tag in draft.tags"
                    :key="tag"
                    class="blog-editor__tag"
                  >
                    <span>{{ tag }}</span>
                    <button
                      type="button"
                      class="blog-editor__tag-remove"
                      :aria-label="`删除标签 ${tag}`"
                      @click="removeTag(tag)"
                    >
                      ×
                    </button>
                  </span>
                </div>
              </div>

              <label class="blog-editor__field blog-editor__field--full">
                <span class="blog-editor__label">Markdown 正文</span>
                <textarea
                  v-model="draft.content"
                  rows="18"
                  placeholder="支持 Markdown 语法，例如标题、列表、代码块、链接等"
                />
              </label>
            </div>

            <p v-if="saveError" class="blog-editor__field-error">
              {{ saveError }}
            </p>

            <div class="blog-editor__actions">
              <button type="submit" class="blog-editor__primary-action" :disabled="isSaving">
                {{ isSaving ? '正在保存…' : '保存文章' }}
              </button>
              <button type="button" class="blog-editor__secondary-action" @click="cancelEdit">
                取消
              </button>
            </div>
          </form>

          <aside class="blog-editor__preview glass-card">
            <div class="blog-editor__preview-header">
              <h2 class="blog-editor__section-title">实时预览</h2>
              <p class="blog-editor__preview-note">
                已用 marked + DOMPurify 清洗预览内容。
              </p>
            </div>

            <div class="blog-editor__preview-meta">
              <div class="blog-editor__preview-title">{{ draft.title || '未命名文章' }}</div>
              <div class="blog-editor__preview-submeta">
                <time>{{ draft.date || '—' }}</time>
                <span v-if="draft.tags.length">·</span>
                <span v-if="draft.tags.length">{{ draft.tags.join(' · ') }}</span>
              </div>
            </div>

            <div
              v-if="draft.content.trim().length"
              class="blog-editor__preview-body"
              v-html="renderedPreview"
            />

            <div v-else class="blog-editor__preview-empty">
              输入 Markdown 后，这里会实时显示渲染结果。
            </div>
          </aside>
        </div>
      </div>

      <ToastNotification :toasts="toasts" />
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Marked } from 'marked'
import DOMPurify from 'dompurify'
import AppLayout from '@/components/layout/AppLayout.vue'
import ToastNotification from '@/components/common/ToastNotification.vue'
import { useToast } from '@/composables/useToast'
import { useBlogPosts } from '@/composables/useBlogPosts'
import type { BlogPost } from '@/types'

interface BlogDraft extends BlogPost {}

const route = useRoute()
const router = useRouter()
const marked = new Marked()
const { show, toasts } = useToast()
const {
  getPost,
  isAuthenticated,
  isAuthLoading,
  isPostsLoading,
  loadPosts,
  refreshSession,
  login,
  logout,
  createPost,
  updatePost,
} = useBlogPosts()

const passwordInputRef = ref<HTMLInputElement | null>(null)
const passwordInput = ref('')
const passwordError = ref('')
const saveError = ref('')
const newTag = ref('')
const isSaving = ref(false)
const slugTouched = ref(false)

const currentId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const isEditing = computed(() => route.name === 'BlogEdit')
const isUnlocked = computed(() => isAuthenticated.value)
const existingPost = computed(() => (isEditing.value ? getPost(currentId.value) : undefined))
const loadError = computed(() => {
  if (!isEditing.value || isPostsLoading.value) return ''
  return existingPost.value ? '' : '这篇文章在服务器上不存在，可能还没有保存过。'
})

const draft = reactive<BlogDraft>(createBlankDraft())

const renderedPreview = computed<string>(() => {
  const raw = marked.parse(draft.content) as string
  return DOMPurify.sanitize(raw)
})

/**
 * Create an empty draft that still contains every BlogPost field.
 */
function createBlankDraft(): BlogDraft {
  return {
    id: '',
    title: '',
    date: todayIsoDate(),
    tags: [],
    excerpt: '',
    content: '',
  }
}

/**
 * Clone a saved post into the draft model.
 */
function cloneDraft(post: BlogPost): BlogDraft {
  return {
    ...post,
    tags: [...post.tags],
  }
}

/**
 * Use the browser's local time so the default date matches what the user sees
 * in the editor.
 */
function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Turn a title into a route-friendly slug. Chinese characters are preserved so
 * the editor can still work without extra dependencies.
 */
function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Copy a draft into the reactive form state.
 */
function applyDraft(nextDraft: BlogDraft): void {
  draft.id = nextDraft.id
  draft.title = nextDraft.title
  draft.date = nextDraft.date
  draft.tags = [...nextDraft.tags]
  draft.excerpt = nextDraft.excerpt
  draft.content = nextDraft.content
}

/**
 * Reset the form whenever the route switches between new and edit modes.
 */
function resetDraft(): void {
  applyDraft(existingPost.value ? cloneDraft(existingPost.value) : createBlankDraft())
  slugTouched.value = false
  saveError.value = ''
  newTag.value = ''
}

/**
 * Keep the slug in sync with the title until the user touches it manually.
 */
function syncSlugFromTitle(): void {
  if (isEditing.value || slugTouched.value) return
  draft.id = slugify(draft.title)
}

/**
 * Mark the slug as user-edited so title changes stop overwriting it.
 */
function onSlugInput(): void {
  if (!isEditing.value) slugTouched.value = true
}

/**
 * Validate the current draft before saving.
 */
function validateDraft(post: BlogDraft): string {
  if (!post.title.trim()) return '请先填写标题。'
  if (!post.id.trim()) return '请先填写 slug / ID。'
  if (!post.date.trim()) return '请先选择日期。'
  if (!post.excerpt.trim()) return '请先填写摘要。'
  if (!post.content.trim()) return '请先填写 Markdown 正文。'
  return ''
}

/**
 * Add a tag from the text field, trimming whitespace and preventing dupes.
 */
function addTag(): void {
  const tag = newTag.value.trim()
  if (!tag) return
  if (draft.tags.includes(tag)) {
    newTag.value = ''
    return
  }

  draft.tags = [...draft.tags, tag]
  newTag.value = ''
}

/**
 * Remove an existing tag from the draft.
 */
function removeTag(tag: string): void {
  draft.tags = draft.tags.filter(item => item !== tag)
}

/**
 * Ask the backend to verify the submitted password and establish a session.
 */
async function unlockEditor(): Promise<void> {
  const submitted = passwordInput.value.trim()
  if (!submitted) {
    passwordError.value = '密码不匹配，请再试一次。'
    return
  }

  passwordError.value = ''
  try {
    await login(submitted)
    passwordInput.value = ''
    show('编辑器已解锁')
  } catch (error) {
    passwordError.value = error instanceof Error ? error.message : '密码不匹配，请再试一次。'
  }
}

/**
 * End the server session without touching the draft currently on screen.
 */
async function lockEditor(): Promise<void> {
  try {
    await logout()
  } catch {
    show('本地已退出编辑模式，服务器会话将在过期后失效。')
    return
  }
  show('已退出编辑模式')
}

/**
 * Save the draft through the authenticated API and jump to the article.
 */
async function saveDraft(): Promise<void> {
  if (isSaving.value) return
  saveError.value = ''

  const nextDraft: BlogDraft = {
    ...draft,
    id: draft.id.trim(),
    title: draft.title.trim(),
    date: draft.date.trim(),
    excerpt: draft.excerpt.trim(),
    content: draft.content,
    tags: draft.tags.map(tag => tag.trim()).filter(Boolean),
  }

  const validationError = validateDraft(nextDraft)
  if (validationError) {
    saveError.value = validationError
    show(validationError)
    return
  }

  const duplicate = getPost(nextDraft.id)
  const originalId = isEditing.value && currentId.value ? currentId.value : ''
  if (duplicate && duplicate.id !== originalId) {
    saveError.value = `Slug “${nextDraft.id}” 已被占用，请换一个。`
    show(saveError.value)
    return
  }

  isSaving.value = true
  try {
    const saved = isEditing.value
      ? await updatePost(nextDraft)
      : await createPost(nextDraft)
    show(`已保存《${saved.title}》`)
    await router.push(`/blog/${saved.id}`)
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存失败，请稍后再试。'
  } finally {
    isSaving.value = false
  }
}

/**
 * Leave the editor without saving. New posts return to the list; edits jump
 * back to the saved article.
 */
function cancelEdit(): void {
  if (isEditing.value && currentId.value) {
    void router.push(`/blog/${currentId.value}`)
    return
  }

  void router.push('/blog')
}

watch(
  () => existingPost.value,
  () => {
    resetDraft()
  },
  { immediate: true },
)

watch(
  () => draft.title,
  () => {
    syncSlugFromTitle()
  },
)

onMounted(async () => {
  await Promise.all([loadPosts(), refreshSession()])
  if (!isUnlocked.value) {
    void nextTick(() => {
      passwordInputRef.value?.focus()
    })
  }
})
</script>

<style lang="scss" scoped>
.blog-editor {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;

  &__hero,
  &__gate,
  &__notice,
  &__form,
  &__preview,
  &__error {
    @include glass-card;
  }

  &__hero {
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
    max-width: 760px;
    color: $text-secondary;
    line-height: 1.7;
  }

  &__secondary-action,
  &__primary-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 $spacing-lg;
    border-radius: $radius-lg;
    font-size: $font-size-sm;
    font-weight: 600;
    text-decoration: none;
    transition:
      transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
      background-color 180ms cubic-bezier(0.23, 1, 0.32, 1),
      color 180ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  &__secondary-action {
    border: 0;
    background: rgba(255, 255, 255, 0.18);
    color: $text-primary;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgba($accent-primary, 0.16);
      color: $accent-primary;
      transform: translateY(-1px);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.62;
      transform: none;
    }
  }

  &__primary-action {
    border: 0;
    background: rgba($accent-primary, 0.18);
    color: $text-primary;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgba($accent-primary, 0.28);
      color: $accent-primary;
      transform: translateY(-1px);
    }
  }

  &__hero-actions {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__gate {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
    padding: $spacing-xl;
  }

  &__gate-copy {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__gate-note {
    color: $text-secondary;
    line-height: 1.7;

    code {
      padding: 1px 6px;
      border-radius: $radius-sm;
      background: rgba(0, 0, 0, 0.06);
      color: $text-primary;
      font-family: $font-mono;
      font-size: $font-size-sm;
    }
  }

  &__gate-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: $spacing-md;
    align-items: end;
  }

  &__workspace {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }

  &__notice {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-lg;
    padding: $spacing-lg $spacing-xl;
  }

  &__notice-copy {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    color: $text-secondary;

    strong {
      color: $text-primary;
      font-size: $font-size-base;
    }

    p {
      line-height: 1.7;
    }
  }

  &__notice-badge {
    flex-shrink: 0;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba($accent-primary, 0.16);
    color: $accent-primary;
    font-size: $font-size-xs;
    font-weight: 600;
  }

  &__error {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    padding: $spacing-xl;

    h2 {
      font-size: $font-size-xl;
      font-weight: 700;
    }

    p {
      color: $text-secondary;
      line-height: 1.7;
    }
  }

  &__error-actions {
    display: flex;
    gap: $spacing-sm;
    flex-wrap: wrap;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
    gap: $spacing-lg;
    align-items: start;
  }

  &__form,
  &__preview {
    padding: $spacing-xl;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }

  &__section-title {
    font-size: $font-size-xl;
    font-weight: 700;
    color: $text-primary;
  }

  &__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $spacing-md;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    min-width: 0;

    &--full {
      grid-column: 1 / -1;
    }
  }

  &__label {
    color: $text-primary;
    font-size: $font-size-sm;
    font-weight: 600;
  }

  &__hint {
    color: $text-muted;
    font-size: $font-size-xs;
    line-height: 1.6;
  }

  &__field-error {
    color: #b54708;
    font-size: $font-size-sm;
    font-weight: 600;
  }

  &__tag-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: $spacing-sm;
    align-items: center;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba($accent-primary, 0.15);
    color: $accent-primary;
    font-size: $font-size-xs;
    font-weight: 600;
  }

  &__tag-remove {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1);

    &:hover,
    &:focus-visible {
      transform: scale(1.1);
    }
  }

  &__preview {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
    min-height: 100%;
  }

  &__preview-header {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  &__preview-note {
    color: $text-muted;
    font-size: $font-size-sm;
  }

  &__preview-meta {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    padding: $spacing-md;
    border-radius: $radius-lg;
    background: rgba(255, 255, 255, 0.16);
  }

  &__preview-title {
    color: $text-primary;
    font-size: $font-size-xl;
    font-weight: 700;
  }

  &__preview-submeta {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
    color: $text-muted;
    font-size: $font-size-sm;
  }

  &__preview-body {
    line-height: 1.8;
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

  &__preview-empty {
    padding: $spacing-xl;
    border-radius: $radius-lg;
    border: 1px dashed rgba($accent-primary, 0.28);
    color: $text-muted;
    text-align: center;
  }
}

input,
textarea {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: $radius-lg;
  background: rgba(255, 255, 255, 0.16);
  color: $text-primary;
  font: inherit;
  padding: 12px 14px;
  outline: none;
  transition:
    border-color 180ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 180ms cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 180ms cubic-bezier(0.23, 1, 0.32, 1);

  &::placeholder {
    color: $text-muted;
  }

  &:focus,
  &:focus-visible {
    border-color: rgba($accent-primary, 0.6);
    background: rgba(255, 255, 255, 0.22);
    box-shadow: 0 0 0 3px rgba($accent-primary, 0.16);
  }

  &:read-only {
    cursor: not-allowed;
    opacity: 0.82;
  }
}

textarea {
  resize: vertical;
  min-height: 96px;
}

@media (max-width: 1023px) {
  .blog-editor {
    &__layout {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 767px) {
  .blog-editor {
    &__hero,
    &__gate,
    &__notice,
    &__form,
    &__preview,
    &__error {
      padding: $spacing-lg;
    }

    &__hero,
    &__notice,
    &__gate-form,
    &__error-actions {
      grid-template-columns: 1fr;
      flex-direction: column;
      align-items: stretch;
    }

    &__fields {
      grid-template-columns: 1fr;
    }

    &__tag-row {
      grid-template-columns: 1fr;
    }

    &__hero-actions,
    &__error-actions {
      width: 100%;
    }

    &__secondary-action,
    &__primary-action {
      width: 100%;
    }
  }
}
</style>
