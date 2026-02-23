'use client'

import { CheckCircle2Icon, InfoIcon, AlertTriangleIcon, XCircleIcon, XIcon } from 'lucide-react'
import { Toast as ToastPrimitive } from 'radix-ui'
import { cn } from '@/shared/lib/utils'
import { useToast, type ToastVariant } from '@/shared/hooks/useToast'

const variantStyles: Record<NonNullable<ToastVariant>, string> = {
  default: 'border-border bg-background text-foreground',
  success: 'border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-500/30',
  info: 'border-blue-500/40 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-100 dark:border-blue-500/30',
  warning: 'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-500/30',
  destructive: 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-100 dark:border-red-500/30',
}

const variantIcons: Record<NonNullable<ToastVariant>, typeof CheckCircle2Icon | null> = {
  default: null,
  success: CheckCircle2Icon,
  info: InfoIcon,
  warning: AlertTriangleIcon,
  destructive: XCircleIcon,
}

const iconColors: Record<NonNullable<ToastVariant>, string> = {
  default: '',
  success: 'text-emerald-600 dark:text-emerald-400',
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
  destructive: 'text-red-600 dark:text-red-400',
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => {
        const variant = t.variant ?? 'default'
        const Icon = variantIcons[variant]
        const isUrgent = variant === 'destructive' || variant === 'warning'

        return (
          <ToastPrimitive.Root
            key={t.id}
            open
            onOpenChange={(open) => { if (!open) dismiss(t.id) }}
            // Use role="alert" + assertive for urgent variants so screen readers announce immediately
            {...(isUrgent ? { 'aria-live': 'assertive' as const, role: 'alert' as const } : {})}
            className={cn(
              'group pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-md border p-4 shadow-lg transition-all',
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full data-[state=open]:fade-in-0',
              'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=closed]:fade-out-0',
              'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
              variantStyles[variant]
            )}
          >
            {Icon && <Icon className={cn('size-5 shrink-0', iconColors[variant])} aria-hidden="true" />}
            <div className="grid flex-1 gap-1">
              {t.title && (
                <ToastPrimitive.Title className="text-sm font-semibold">
                  {t.title}
                </ToastPrimitive.Title>
              )}
              {t.description && (
                <ToastPrimitive.Description className="text-sm opacity-90">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              className="rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100 focus:opacity-100 focus:outline-none"
              aria-label="Close notification"
            >
              <XIcon className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )
      })}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-sm" />
    </ToastPrimitive.Provider>
  )
}
