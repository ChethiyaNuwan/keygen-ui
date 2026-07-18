import { useState, useEffect, useCallback } from 'react'
import { KeygenListResponse } from '@/lib/types/keygen'

const DEFAULT_PAGE_SIZE = 25

interface UsePaginatedListOptions<T> {
  /**
   * Fetches one page. Must not throw — on failure, call the page's own
   * error handler (so the toast names the right resource) and resolve to
   * `{ data: [], meta: { count: 0 } }`, the same pattern already used by
   * section-cards.tsx and the various *-details-dialog loaders.
   */
  fetcher: (page: number, pageSize: number) => Promise<KeygenListResponse<T>>
  pageSize?: number
  /** When any value in this array changes, page resets to 1 (filters, search term, …). */
  resetOn?: readonly unknown[]
}

/**
 * Owns page/pageSize/totalCount/loading/data for a server-paginated list,
 * including the reset-to-page-1-on-filter-change effect every management
 * page needs. The fetcher closure is where per-resource behavior (status
 * filters, server-side search vs plain list, …) lives — this hook only
 * owns the paging mechanics.
 */
export function usePaginatedList<T>({ fetcher, pageSize: initialPageSize = DEFAULT_PAGE_SIZE, resetOn = [] }: UsePaginatedListOptions<T>) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [data, setData] = useState<T[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetcher(page, pageSize)
    setData(response.data || [])
    setTotalCount(response.meta?.count ?? response.data?.length ?? 0)
    setLoading(false)
  }, [fetcher, page, pageSize])

  useEffect(() => {
    load()
  }, [load])

  // A changed page size makes the current page number potentially
  // meaningless (e.g. page 4 of 10-per-page has no equivalent at
  // 100-per-page), so it resets page like any other filter change.
  //
  // resetOn is a caller-provided list of dependencies (filters, search term,
  // …) — spread into a literal so the lint rule can still see an array
  // literal, even though it can't verify what's inside.
  useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, ...resetOn])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return {
    data,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    reload: load,
  }
}
