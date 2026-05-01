import { ref, computed, watch } from 'vue'
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
  const dragStart = ref<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)

  // Reactive layouts — merge saved sizes with defaults
  const savedSizes = loadSizes()
  const layouts = ref<WidgetLayout[]>(
    WIDGETS.map(w => ({
      ...w,
      width: savedSizes[w.id]?.width ?? w.width,
      height: savedSizes[w.id]?.height ?? w.height,
    }))
  )

  const offsets = ref<Record<string, WidgetOffset>>(loadOffsets())

  const containerStyle = computed(() => ({
    position: 'relative' as const,
    width: '1100px',
    margin: '0 auto' as const,
  }))

  function getWidgetStyle(id: string): Record<string, string | number> {
    const widget = layouts.value.find(w => w.id === id)
    if (!widget) return { display: 'none' }
    const offset = offsets.value[id]
    const left = widget.left + (offset?.x ?? 0)
    const top = widget.top + (offset?.y ?? 0)
    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${widget.width}px`,
      height: `${widget.height}px`,
    }
  }

  function updateSize(id: string, width: number, height: number) {
    const widget = layouts.value.find(w => w.id === id)
    if (!widget) return
    widget.width = width
    widget.height = height
    // Persist to localStorage
    const sizes = loadSizes()
    sizes[id] = { width, height }
    localStorage.setItem(STORAGE_KEY_SIZES, JSON.stringify(sizes))
  }

  function startDrag(id: string, event: PointerEvent) {
    draggingId.value = id
    const offset = offsets.value[id] ?? { x: 0, y: 0 }
    dragStart.value = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
  }

  function onDrag(event: PointerEvent) {
    if (!draggingId.value || !dragStart.value) return
    const dx = event.clientX - dragStart.value.x
    const dy = event.clientY - dragStart.value.y
    offsets.value = {
      ...offsets.value,
      [draggingId.value]: {
        x: dragStart.value.offsetX + dx,
        y: dragStart.value.offsetY + dy,
      },
    }
  }

  function endDrag() {
    draggingId.value = null
    dragStart.value = null
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
    dragStart.value = null
  }

  function cancelDrag() {
    // Reload offsets from storage (discard unsaved changes)
    offsets.value = loadOffsets()
    isDragMode.value = false
  }

  return {
    isSettingsOpen,
    isDragMode,
    draggingId,
    layouts,
    offsets,
    containerStyle,
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
