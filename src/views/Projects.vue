<template>
  <AppLayout>
    <div class="projects">
      <h1 class="projects__title">项目</h1>

      <!-- Tag filter -->
      <div class="projects__tags">
        <button
          v-for="tag in allTags"
          :key="tag"
          class="projects__tag"
          :class="{ 'projects__tag--active': selectedTag === tag }"
          @click="selectedTag = tag"
        >
          {{ tag }}
        </button>
      </div>

      <div v-if="loading" class="projects__loading">
        <p>正在加载项目...</p>
      </div>

      <div v-else-if="error" class="projects__error">
        <p>{{ error }}</p>
      </div>

      <div v-else-if="filteredProjects.length === 0" class="projects__empty">
        <p>没有匹配的项目</p>
      </div>

      <div v-else class="projects__grid">
        <div
          v-for="project in filteredProjects"
          :key="project.id"
          class="projects__card glass-card"
        >
          <router-link :to="`/projects/${project.id}`" class="projects__card-title-link">
            <h2 class="projects__card-name">{{ project.name }}</h2>
          </router-link>
          <p class="projects__card-description">{{ project.description }}</p>
          <div class="projects__card-techs">
            <span
              v-for="tech in project.tech"
              :key="tech"
              class="projects__card-tech"
            >
              {{ tech }}
            </span>
          </div>
          <a
            :href="project.url"
            target="_blank"
            rel="noopener noreferrer"
            class="projects__card-link"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub
          </a>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'

interface ProjectData {
  id: string
  name: string
  description: string
  tech: string[]
  url: string
  readme: string
}

const projects = ref<ProjectData[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedTag = ref('全部')

const allTags = computed(() => {
  const tags = new Set<string>()
  tags.add('全部')
  projects.value.forEach(p => p.tech.forEach(t => tags.add(t)))
  return Array.from(tags)
})

const filteredProjects = computed(() => {
  if (selectedTag.value === '全部') return projects.value
  return projects.value.filter(p => p.tech.includes(selectedTag.value))
})

const baseUrl = import.meta.env.BASE_URL || '/'

onMounted(async () => {
  try {
    const res = await fetch(`${baseUrl}projects-data/projects.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    projects.value = await res.json()
  } catch (e) {
    error.value = '无法加载项目数据'
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.projects {
  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    margin-bottom: $spacing-xl;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;
    margin-bottom: $spacing-xl;
  }

  &__tag {
    padding: 6px 16px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: $text-secondary;
    font-size: $font-size-sm;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.4);
      color: $text-primary;
    }

    &--active {
      background: $accent-primary;
      color: #fff;
      border-color: $accent-primary;

      &:hover {
        background: $accent-primary;
        color: #fff;
        opacity: 0.9;
      }
    }
  }

  &__loading,
  &__error,
  &__empty {
    text-align: center;
    padding: $spacing-3xl;
    color: $text-muted;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: $spacing-lg;
  }

  &__card {
    @include glass-card;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
  }

  &__card-title-link {
    text-decoration: none;
    color: inherit;

    &:hover .projects__card-name {
      color: $accent-primary;
    }
  }

  &__card-name {
    font-size: $font-size-xl;
    font-weight: 600;
    color: $text-primary;
    transition: color $transition-fast;
  }

  &__card-description {
    color: $text-secondary;
    font-size: $font-size-base;
    line-height: 1.6;
  }

  &__card-techs {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
  }

  &__card-tech {
    padding: 2px 8px;
    border-radius: $radius-sm;
    background: rgba($accent-primary, 0.25);
    color: #4a8ba8;
    font-weight: 500;
    font-size: $font-size-xs;
  }

  &__card-link {
    margin-top: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    padding: 6px 14px;
    border-radius: $radius-md;
    background: #24292e;
    color: #fff;
    font-size: $font-size-sm;
    font-weight: 500;
    text-decoration: none;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 0.85;
    }
  }
}
</style>
