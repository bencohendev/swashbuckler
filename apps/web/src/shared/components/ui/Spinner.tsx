import { LoaderIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const sizeClasses = {
  sm: "size-3",
  md: "size-4",
  lg: "size-6",
} as const

export function Spinner({
  size = "md",
  className,
}: {
  size?: keyof typeof sizeClasses
  className?: string
}) {
  return (
    <LoaderIcon
      aria-hidden="true"
      className={cn("animate-spin", sizeClasses[size], className)}
    />
  )
}
