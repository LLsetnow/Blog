import type { BlogPost } from '@/types'

export const blogPosts: BlogPost[] = [
  {
    id: 'hello-world',
    title: 'Hello World',
    date: '2026-05-02',
    tags: ['随笔'],
    excerpt: '这是我的第一篇博客文章，欢迎来到我的个人博客！',
    content: `
# Hello World!

欢迎来到我的个人博客！这是我的第一篇博客文章。

## 关于我

我是一名全栈开发者，热爱技术，喜欢探索新事物。

## 关于这个博客

这个博客使用 Vue 3 + TypeScript 构建，采用毛玻璃（Glassmorphism）设计风格。

希望在这里分享技术心得和生活感悟。

---

*发布于 2026年5月2日*
    `.trim(),
  },
]
