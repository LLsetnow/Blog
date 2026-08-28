import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '@/views/HomePage.vue'

/** Must track the .page-leave-active duration in global.scss. */
const PAGE_LEAVE_MS = 160

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
    path: '/blog/new',
    name: 'BlogNew',
    component: () => import('@/views/BlogEditor.vue'),
  },
  {
    path: '/blog/edit/:id',
    name: 'BlogEdit',
    component: () => import('@/views/BlogEditor.vue'),
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

  /**
   * Start new pages at the top, but hand back the remembered offset when the
   * reader uses the browser's back and forward buttons.
   *
   * Deferred by the leave duration: the page transition mounts the incoming
   * view only after the outgoing one has left, so resolving immediately would
   * scroll a page that has no height yet and the restored offset would clamp
   * to zero.
   */
  scrollBehavior(_to, _from, savedPosition) {
    const settle = PAGE_LEAVE_MS + 20

    if (!savedPosition) {
      return new Promise(resolve => setTimeout(() => resolve({ top: 0 }), settle))
    }

    // Restoring an offset also needs the page to be that tall again, and the
    // news, projects and favourites views only reach their full height after
    // fetching. Wait for the height rather than guessing a longer delay.
    return new Promise(resolve => {
      const deadline = performance.now() + 1500
      const check = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight
        if (scrollable >= savedPosition.top || performance.now() > deadline) {
          resolve(savedPosition)
        } else {
          requestAnimationFrame(check)
        }
      }
      setTimeout(check, settle)
    })
  },
})

export default router
