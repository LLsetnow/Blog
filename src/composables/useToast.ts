import { ref } from 'vue'

export interface ToastMessage {
  text: string
  id: number
}

const toasts = ref<ToastMessage[]>([])
let nextId = 0

export function useToast() {
  function show(text: string, duration = 2000) {
    const id = nextId++
    toasts.value = [...toasts.value, { text, id }]
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  return { toasts, show }
}
