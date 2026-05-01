import { ref, shallowRef } from 'vue'
import type { WidgetLayout, WidgetOffset } from '@/types'

export const WIDGETS: WidgetLayout[] = [
  { id: 'greeting',  label: '问候卡',     left: 0,   top: 0,   width: 300, height: 170 },
  { id: 'calendar',  label: '日历',       left: 0,   top: 194, width: 300, height: 260 },
  { id: 'github',    label: 'GitHub',     left: 0,   top: 478, width: 300, height: 90  },
  { id: 'clock',     label: '时钟',       left: 325, top: 0,   width: 200, height: 200 },
  { id: 'music',     label: '音乐播放器', left: 325, top: 224, width: 590, height: 130 },
  { id: 'gallery',   label: '图片画廊',   left: 325, top: 378, width: 590, height: 300 },
  { id: 'nav',       label: '导航菜单',   left: 940, top: 378, width: 160, height: 300 },
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

export function useLayoutEditor() {
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
