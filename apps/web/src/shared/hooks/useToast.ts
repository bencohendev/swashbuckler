import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'info' | 'warning' | 'destructive'

export interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

interface ToastState {
  toasts: ToastData[]
  toast: (props: Omit<ToastData, 'id'>) => string
  dismiss: (id: string) => void
}

let counter = 0

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  toast: (props) => {
    const id = String(++counter)
    set((state) => ({ toasts: [...state.toasts, { ...props, id }] }))

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 5000)

    return id
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

// Imperative helper — can be called outside of React components
export const toast = useToast.getState().toast
