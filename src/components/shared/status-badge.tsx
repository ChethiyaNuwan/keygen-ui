import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Shared visual vocabulary for status badges. Keygen statuses vary by
 * resource (license: active/suspended/expired; machine: alive/dead;
 * release: DRAFT/PUBLISHED/YANKED; user: banned boolean) so this doesn't try
 * to hardcode every status string — callers map their specific status to one
 * of these four tones, and get the same colors everywhere instead of ~4
 * separately-maintained (and drifting) copies of the same switch statement.
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
  neutral: 'bg-gray-100 text-gray-800 border-gray-200',
}

interface StatusBadgeProps {
  tone: StatusTone
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function StatusBadge({ tone, children, icon, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone], 'flex items-center gap-1 w-fit', className)}>
      {icon}
      {children}
    </Badge>
  )
}
