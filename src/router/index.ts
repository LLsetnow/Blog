import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import BlogList from '@/views/BlogList.vue'
import BlogPost from '@/views/BlogPost.vue'
import Projects from '@/views/Projects.vue'
import ProjectPost from '@/views/ProjectPost.vue'
import About from '@/views/About.vue'
import Favorites from '@/views/Favorites.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: Favorites,
  },
  {
    path: '/blog',
    name: 'BlogList',
    component: BlogList,
  },
  {
    path: '/blog/:id',
    name: 'BlogPost',
    component: BlogPost,
  },
  {
    path: '/projects',
    name: 'Projects',
    component: Projects,
  },
  {
    path: '/projects/:id',
    name: 'ProjectPost',
    component: ProjectPost,
  },
  {
    path: '/about',
    name: 'About',
    component: About,
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
