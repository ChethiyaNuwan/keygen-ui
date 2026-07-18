import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'

interface TableSkeletonProps {
  /** Number of skeleton rows to render. */
  rows: number
  /** Number of columns — each renders a Skeleton sized for typical cell content. */
  columns: number
}

/**
 * Loading-state rows for a table body. Widths are varied so the skeleton
 * doesn't read as a suspiciously perfect grid.
 */
export function TableSkeleton({ rows, columns }: TableSkeletonProps) {
  const widths = ['w-40', 'w-28', 'w-16', 'w-24', 'w-24', 'w-20', 'w-12']

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className={`h-4 ${widths[colIndex % widths.length]}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
