import { LucideIcon } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  /** Number of table columns to span. */
  colSpan: number
}

/** A single full-width table row shown when a list has no results. */
export function EmptyState({ icon: Icon, title, description, colSpan }: EmptyStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Icon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
