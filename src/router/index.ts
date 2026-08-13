import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '@/views/HomePage.vue'

/**
 * Only the home page is bundled eagerly — it is the landing route, so deferring
 * it would just add a round trip. Everything else is split out: statically
 * importing them pulled the whole site, including `marked` and `DOMPurify`,
 * into the entry chunk for visitors who never leave the home page.
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/views/Favorites.vue'),
  },
  {
    path: '/blog',
    name: 'BlogList',
    component: () => import('@/views/BlogList.vue'),
  },
  {
    path: '/blog/:id',
    name: 'BlogPost',
    component: () => import('@/views/BlogPost.vue'),
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/views/Projects.vue'),
  },
  {
    path: '/projects/:id',
    name: 'ProjectPost',
    component: () => import('@/views/ProjectPost.vue'),
  },
  {
    path: '/news',
    name: 'News',
    component: () => import('@/views/News.vue'),
  },
  {
    path: '/now-playing',
    name: 'NowPlaying',
    component: () => import('@/views/NowPlaying.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
