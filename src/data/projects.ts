import type { ProjectItem } from '@/types'

export const projects: ProjectItem[] = [
  {
    id: 'comfy-script',
    name: 'ComfyScript',
    description: '飞书机器人 + ComfyUI 工作流自动化工具',
    tech: ['Python', 'Feishu API', 'ComfyUI'],
    url: 'https://github.com/LLsetnow/ComfyScript',
    content: `
# ComfyScript

飞书机器人 + ComfyUI 工作流自动化工具。

## 功能介绍

- 通过飞书机器人发送指令，自动执行 ComfyUI 工作流
- 支持参数自定义，灵活配置生成任务
- 实时推送任务状态到飞书

## 技术栈

- Python 后端
- 飞书开放 API
- ComfyUI API 集成

---

*更多详情请查看 GitHub 仓库*
    `.trim(),
  },
  {
    id: 'personal-blog',
    name: '个人博客',
    description: '基于 Vue 3 的毛玻璃风格个人博客网站',
    tech: ['Vue 3', 'TypeScript', 'SCSS'],
    url: 'https://github.com/LLsetnow/Blog',
    content: `
# 个人博客

基于 Vue 3 的毛玻璃（Glassmorphism）风格个人博客网站。

## 功能特性

- 毛玻璃设计风格
- 响应式布局
- 3D 悬浮卡片效果
- 像素级拖拽布局
- 音乐播放器
- 图片画廊

## 技术栈

- Vue 3 + TypeScript
- SCSS
- Vite

---

*更多详情请查看 GitHub 仓库*
    `.trim(),
  },
]
