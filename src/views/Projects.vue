<template>
  <AppLayout>
    <div class="projects">
      <h1 class="projects__title">项目</h1>

      <div class="projects__grid">
        <a
          v-for="project in projects"
          :key="project.name"
          :href="project.url"
          target="_blank"
          rel="noopener noreferrer"
          class="projects__card glass-card"
        >
          <h2 class="projects__card-name">{{ project.name }}</h2>
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
          <span class="projects__card-link">GitHub &rarr;</span>
        </a>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'

interface ProjectItem {
  name: string
  description: string
  tech: string[]
  url: string
}

const projects: ProjectItem[] = [
  {
    name: 'ComfyScript',
    description: '飞书机器人 + ComfyUI 工作流自动化工具',
    tech: ['Python', 'Feishu API', 'ComfyUI'],
    url: 'https://github.com/LLsetnow/ComfyScript',
  },
  {
    name: '个人博客',
    description: '基于 Vue 3 的毛玻璃风格个人博客网站',
    tech: ['Vue 3', 'TypeScript', 'SCSS'],
    url: 'https://github.com/LLsetnow/Blog',
  },
]
</script>

<style lang="scss" scoped>
.projects {
  &__title {
    font-size: $font-size-2xl;
    font-weight: 700;
    margin-bottom: $spacing-xl;
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

    &:hover {
      .projects__card-name {
        color: $accent-primary;
      }
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
    background: rgba($accent-primary, 0.15);
    color: $accent-primary;
    font-size: $font-size-xs;
  }

  &__card-link {
    margin-top: auto;
    color: $accent-primary;
    font-size: $font-size-sm;
    font-weight: 500;
  }
}
</style>
