'use client'

import { type ComponentProps, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSidebar } from '@/shared/stores/sidebar'
import { useNavigation } from '@/shared/stores/navigation'
import { useRecentAccess } from '@/shared/stores/recentAccess'
import { useDataClient } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'

type LinkProps = ComponentProps<typeof Link>

interface SidebarLinkProps extends Omit<LinkProps, 'className'> {
  className?: string | ((isActive: boolean) => string)
}

const OBJECT_PATH_RE = /^\/objects\/([0-9a-f-]+)$/

export function SidebarLink({ className, onClick, onMouseEnter, href, ...props }: SidebarLinkProps) {
  const pathname = usePathname()
  const pendingPath = useSidebar((s) => s.pendingPath)
  const setPendingPath = useSidebar((s) => s.setPendingPath)
  const setNavigating = useNavigation((s) => s.setNavigating)
  const queryClient = useQueryClient()
  const dataClient = useDataClient()

  const hrefString = typeof href === 'string' ? href : href.pathname ?? ''
  const isActive = pathname === hrefString || pendingPath === hrefString

  const trackAccess = useRecentAccess((s) => s.trackAccess)

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Don't set pending path for modifier-key clicks (new tab/window)
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
      setPendingPath(hrefString)
      if (pathname !== hrefString) {
        setNavigating(true)
      }
      const match = hrefString.match(OBJECT_PATH_RE)
      if (match) {
        trackAccess(match[1])
      }
    }
    onClick?.(e)
  }

  const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    const match = hrefString.match(OBJECT_PATH_RE)
    if (match) {
      const objectId = match[1]
      queryClient.prefetchQuery({
        queryKey: queryKeys.objects.detail(objectId),
        queryFn: async () => {
          const result = await dataClient.objects.get(objectId)
          if (result.error) throw new Error(result.error.message)
          return result.data
        },
      })
    }
    onMouseEnter?.(e)
  }

  const resolvedClassName = typeof className === 'function' ? className(isActive) : className

  return (
    <Link
      href={href}
      className={resolvedClassName}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      aria-current={isActive ? 'page' : undefined}
      {...props}
    />
  )
}
