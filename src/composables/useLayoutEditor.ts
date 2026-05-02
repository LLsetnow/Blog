import { ref, shallowRef } from 'vue'
import type { WidgetLayout, WidgetOffset } from '@/types'

export const WIDGETS: WidgetLayout[] = [
  { id: 'greeting',  label: '问候卡',     left:  -78, top:   84, width: 480, height: 170 },
  { id: 'calendar',  label: '日历',       left:  -83, top:  293, width: 420, height: 450 },
  { id: 'github',    label: 'GitHub',     left:  -84, top:  823, width: 100, height: 100 },
  { id: 'clock',     label: '时钟',       left:  718, top:  112, width: 230, height: 200 },
  { id: 'music',     label: '音乐播放器',  left:  438, top:  448, width: 430, height: 160 },
  { id: 'gallery',   label: '图片画廊',    left:  385, top:  673, width: 590, height: 260 },
  { id: 'nav',       label: '导航菜单',    left: 1022, top:  383, width: 200, height: 330 },
  { id: 'email',     label: '邮箱',       left:   26, top:  823, width: 100, height: 100 },
  { id: 'wechat',    label: '微信',       left:  136, top:  823, width: 100, height: 100 },
]

const STORAGE_KEY_OFFSETS = 'blog-layout-offsets'
const STORAGE_KEY_SIZES = 'blog-layout-sizes'

function loadOffsets(): Record<string, WidgetOffset> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFSETS)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function loadSizes(): Record<string, { width: number; height: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIZES)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Read current offsets + sizes from localStorage, merge with WIDGETS base,
 * and return a TypeScript code string ready to paste into useLayoutEditor.ts
 */
export function generateLayoutCode(): string {
  const offs = loadOffsets()
  const sizes = loadSizes()

  const merged = WIDGETS.map(w => {
    const off = offs[w.id]
    const sz = sizes[w.id]
    return {
      ...w,
      left: Math.round(w.left + (off?.x ?? 0)),
      top: Math.round(w.top + (off?.y ?? 0)),
      width: sz?.width ?? w.width,
      height: sz?.height ?? w.height,
    }
  })

  const lines = merged.map(w => {
    const id = `'${w.id}'`.padEnd(13)
    const label = `'${w.label}'`.padEnd(10)
    const left = String(w.left).padStart(5)
    const top = String(w.top).padStart(5)
    const width = String(w.width).padStart(4)
    const height = String(w.height).padStart(4)
    return `  { id: ${id}, label: ${label}, left: ${left}, top: ${top}, width: ${width}, height: ${height} },`
  })

  return [
    "import type { WidgetLayout } from '@/types'",
    '',
    'export const WIDGETS: WidgetLayout[] = [',
    ...lines,
    ']',
    '',
  ].join('\n')
}

export function useLayoutEditor() {
  // Clear stale localStorage offsets/sizes — WIDGETS already includes them
  try {
    localStorage.removeItem(STORAGE_KEY_OFFSETS)
    localStorage.removeItem(STORAGE_KEY_SIZES)
  } catch { /* noop */ }

  const isSettingsOpen = ref(false)
  const isDragMode = ref(false)
  const draggingId = ref<string | null>(null)

  // Merge saved sizes with defaults
  const savedSizes = loadSizes()
  const layouts = ref<WidgetLayout[]>(
    WIDGETS.map(w => ({
      ...w,
      width: savedSizes[w.id]?.width ?? w.width,
      height: savedSizes[w.id]?.height ?? w.height,
    }))
  )

  // Use shallowRef: offsets only trigger re-render on drag end, not during drag
  const offsets = shallowRef<Record<string, WidgetOffset>>(loadOffsets())

  // Internal drag state — not exposed to template
  let dragState: {
    id: string
    startX: number
    startY: number
    baseX: number
    baseY: number
    el: HTMLElement
  } | null = null

  function getWidgetStyle(id: string): Record<string, string | number> {
    const widget = layouts.value.find(w => w.id === id)
    if (!widget) return { display: 'none' }
    const offset = offsets.value[id]
    return {
      position: 'absolute',
      left: `${widget.left + (offset?.x ?? 0)}px`,
      top: `${widget.top + (offset?.y ?? 0)}px`,
      width: `${widget.width}px`,
      height: `${widget.height}px`,
    }
  }

  function updateSize(id: string, width: number, height: number) {
    layouts.value = layouts.value.map(w =>
      w.id === id ? { ...w, width, height } : { ...w }
    )
    const sizes = loadSizes()
    sizes[id] = { width, height }
    localStorage.setItem(STORAGE_KEY_SIZES, JSON.stringify(sizes))
  }

  // === Drag with Pointer Capture + direct DOM manipulation ===
  function startDrag(id: string, event: PointerEvent) {
    const el = event.currentTarget as HTMLElement
    el.setPointerCapture(event.pointerId)

    const offset = offsets.value[id] ?? { x: 0, y: 0 }
    dragState = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
      el,
    }
    draggingId.value = id

    // Remove CSS transition for responsive dragging
    el.style.transition = 'none'
  }

  function onDrag(event: PointerEvent) {
    if (!dragState) return
    const dx = event.clientX - dragState.startX
    const dy = event.clientY - dragState.startY
    // Direct DOM transform — bypasses Vue reactivity entirely
    dragState.el.style.transform = `translate(${dx}px, ${dy}px)`
  }

  function endDrag(event: PointerEvent) {
    if (!dragState) return
    const dx = event.clientX - dragState.startX
    const dy = event.clientY - dragState.startY

    // Commit final offset to Vue state (one single update)
    offsets.value = {
      ...offsets.value,
      [dragState.id]: {
        x: dragState.baseX + dx,
        y: dragState.baseY + dy,
      },
    }

    // Clean up direct DOM modifications
    dragState.el.style.transform = ''
    dragState.el.style.transition = ''

    draggingId.value = null
    dragState = null
  }

  function saveOffsets() {
    localStorage.setItem(STORAGE_KEY_OFFSETS, JSON.stringify(offsets.value))
    isDragMode.value = false
  }

  function openSettings() {
    isSettingsOpen.value = true
  }

  function closeSettings() {
    isSettingsOpen.value = false
  }

  function enterDragMode() {
    isSettingsOpen.value = false
    isDragMode.value = true
    draggingId.value = null
    dragState = null
  }

  function cancelDrag() {
    offsets.value = loadOffsets()
    isDragMode.value = false
  }

  return {
    isSettingsOpen,
    isDragMode,
    draggingId,
    layouts,
    offsets,
    getWidgetStyle,
    updateSize,
    startDrag,
    onDrag,
    endDrag,
    saveOffsets,
    openSettings,
    closeSettings,
    enterDragMode,
    cancelDrag,
  }
}
