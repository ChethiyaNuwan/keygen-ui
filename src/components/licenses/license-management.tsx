'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getKeygenApi } from '@/lib/api'
import { License, KeygenListResponse } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  MoreVertical,
  Key,
  Calendar,
  Users,
  Activity,
  Pause,
  Play,
  Trash2,
  Edit,
  Copy,
  Download,
  X,
  Loader2,
  BadgeCheck,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDate } from '@/lib/utils/format'
import { StatusBadge, StatusTone } from '@/components/shared/status-badge'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useDebounce } from '@/hooks/use-debounce'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { CreateLicenseDialog } from './create-license-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EditLicenseDialog } from './edit-license-dialog'
import { LicenseDetailsDialog } from './license-details-dialog'
import { GenerateActivationTokenDialog } from './generate-activation-token-dialog'

const SEARCH_DEBOUNCE_MS = 300

export function LicenseManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)

  // Search state
  const [isSearchMode, setIsSearchMode] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)

  // Account-wide counts for the stats cards (independent of the current page/search)
  const [accountStats, setAccountStats] = useState({ active: 0, expired: 0, loading: true })

  const api = getKeygenApi()

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Escape to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchTerm('')
        searchInputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Build search query from the search term.
  // Uses OR logic so any matching field returns results.
  const buildSearchQuery = useCallback((term: string) => {
    const query: Record<string, string> = {}
    if (term.length < 3) return query

    // Always search by name (ILIKE substring match)
    query.name = term

    // If it looks like a UUID, search by id
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-/i
    if (uuidPattern.test(term)) {
      query.id = term
    }

    // If it contains hyphens and uppercase (license key pattern), search by key
    if (term.includes('-') && /[A-F0-9]{4,}/.test(term)) {
      query.key = term
    }

    // If it looks like an email, search by user
    if (term.includes('@')) {
      query.user = term
    }

    return query
  }, [])

  // Unified fetcher: handles both search and browse modes
  const fetchLicenses = useCallback(async (page: number, pageSize: number): Promise<KeygenListResponse<License>> => {
    try {
      const searchQuery = debouncedSearch ? buildSearchQuery(debouncedSearch) : null
      const hasValidSearch = searchQuery && Object.keys(searchQuery).length > 0

      if (hasValidSearch) {
        // Server-side search via POST /search with pagination
        setIsSearchMode(true)
        return await api.search.search<License>({
          type: 'licenses',
          query: searchQuery,
          op: 'OR',
          page: { size: pageSize, number: page },
        })
      }

      // Normal paginated browsing
      setIsSearchMode(false)
      return await api.licenses.list({
        page: { size: pageSize, number: page },
        ...(statusFilter !== 'all' && { status: statusFilter as License['attributes']['status'] })
      })
    } catch (error: unknown) {
      handleLoadError(error, 'licenses')
      return { data: [], meta: { count: 0 } }
    }
  }, [api.licenses, api.search, statusFilter, debouncedSearch, buildSearchQuery])

  const {
    data: licenses,
    loading,
    page: currentPage,
    setPage: setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    reload: loadData,
  } = usePaginatedList<License>({
    fetcher: fetchLicenses,
    resetOn: [statusFilter, debouncedSearch],
  })

  // Account-wide active/expired counts for the stats cards. These are separate
  // queries (limit: 1, status filter) so the numbers reflect all licenses, not
  // just the currently loaded page.
  const loadAccountStats = useCallback(async () => {
    try {
      setAccountStats(prev => ({ ...prev, loading: true }))
      const [activeResponse, expiredResponse] = await Promise.all([
        api.licenses.list({ limit: 1, status: 'ACTIVE' }),
        api.licenses.list({ limit: 1, status: 'EXPIRED' }),
      ])
      setAccountStats({
        active: activeResponse.meta?.count ?? 0,
        expired: expiredResponse.meta?.count ?? 0,
        loading: false,
      })
    } catch {
      setAccountStats(prev => ({ ...prev, loading: false }))
    }
  }, [api.licenses])

  useEffect(() => {
    loadAccountStats()
  }, [loadAccountStats])

  // Refresh handler — used after CRUD operations
  const handleRefresh = useCallback(async () => {
    await Promise.all([loadData(), loadAccountStats()])
  }, [loadData, loadAccountStats])

  const getLicenseStatusTone = (status: string): StatusTone => {
    switch (status.toLowerCase()) {
      case 'active': return 'success'
      case 'suspended': return 'warning'
      case 'expiring': return 'warning'
      case 'expired': return 'danger'
      case 'banned': return 'danger'
      default: return 'neutral'
    }
  }

  /**
   * Asks the server whether the licence is usable right now, and shows why not
   * if it isn't (EXPIRED, SUSPENDED, TOO_MANY_MACHINES, …). The status column
   * alone does not explain, say, an active licence that has used up its seats.
   */
  const handleValidateLicense = async (license: License) => {
    try {
      const result = await api.licenses.validate(license.id)
      const meta = result.meta

      if (meta?.valid) {
        toast.success(`Valid — ${meta.detail}`)
      } else {
        toast.warning(`Not valid — ${meta?.detail ?? 'unknown reason'}`, {
          description: meta?.code,
        })
      }
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License', { customMessage: 'Failed to validate license' })
    }
  }

  const handleSuspendLicense = async (license: License) => {
    try {
      await api.licenses.suspend(license.id)
      await handleRefresh()
      toast.success('License suspended successfully')
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License', { customMessage: 'Failed to suspend license' })
    }
  }

  const handleReinstateLicense = async (license: License) => {
    try {
      await api.licenses.reinstate(license.id)
      await handleRefresh()
      toast.success('License reinstated successfully')
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License', { customMessage: 'Failed to reinstate license' })
    }
  }

  const handleRenewLicense = async (license: License) => {
    try {
      await api.licenses.renew(license.id)
      await handleRefresh()
      toast.success('License renewed successfully')
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License', { customMessage: 'Failed to renew license' })
    }
  }

  const copyLicenseKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('License key copied to clipboard')
  }

  const handleDeleteLicense = (license: License) => {
    setSelectedLicense(license)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteLicense = async () => {
    if (!selectedLicense) return
    try {
      setDeleting(true)
      await api.licenses.delete(selectedLicense.id)
      toast.success('License deleted successfully')
      setDeleteDialogOpen(false)
      await handleRefresh()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'License', {
        onNotFound: () => { setDeleteDialogOpen(false); handleRefresh() },
        customMessage: 'Cannot delete license - it may be in use or have active machines',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleEditLicense = (license: License) => {
    setSelectedLicense(license)
    setEditDialogOpen(true)
  }

  const handleViewDetails = (license: License) => {
    setSelectedLicense(license)
    setDetailsDialogOpen(true)
  }

  const handleGenerateToken = (license: License) => {
    setSelectedLicense(license)
    setTokenDialogOpen(true)
  }

  const clearSearch = () => {
    setSearchTerm('')
    setCurrentPage(1)
    searchInputRef.current?.focus()
  }

  // Usage has no server-side aggregate — sum from the currently loaded page only.
  const pageUsage = licenses.reduce((acc, l) => acc + (l.attributes.uses || 0), 0)

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Licenses</h1>
          <p className="text-muted-foreground">
            Manage and monitor your software licenses
          </p>
        </div>
        <CreateLicenseDialog onLicenseCreated={handleRefresh} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              {isSearchMode ? `${totalCount} matching search` : 'All licenses'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountStats.loading ? '...' : accountStats.active}</div>
            <p className="text-xs text-muted-foreground">Currently active licenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountStats.loading ? '...' : accountStats.expired}</div>
            <p className="text-xs text-muted-foreground">Need renewal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage (this page)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pageUsage}</div>
            <p className="text-xs text-muted-foreground">Activations on the current page</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative basis-full sm:basis-auto flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search by key, name, or ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 pr-20"
          />
          {searchTerm ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
          {isSearchMode && loading && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-[150px] sm:flex-none">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="EXPIRING">Expiring</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="BANNED">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Licenses Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>License List</CardTitle>
              <CardDescription>
                {isSearchMode
                  ? `${totalCount} result${totalCount !== 1 ? 's' : ''} for "${debouncedSearch}"`
                  : `${totalCount} license${totalCount !== 1 ? 's' : ''} total`
                }
              </CardDescription>
            </div>
            {isSearchMode && (
              <Badge variant="secondary" className="text-xs">
                Search results
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">License Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px] pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={Math.min(pageSize, 10)} columns={7} />
              ) : licenses.length > 0 ? (
                licenses.map((license) => (
                  <TableRow key={license.id} className="group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">
                          {license.attributes.key.substring(0, 20)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyLicenseKey(license.attributes.key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {license.attributes.name || (
                        <span className="text-muted-foreground italic">Unnamed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={getLicenseStatusTone(license.attributes.status)}>
                        {license.attributes.status.toLowerCase()}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <span className="tabular-nums">
                        {license.attributes.uses || 0}
                        {license.attributes.maxUses ? (
                          <span className="text-muted-foreground"> / {license.attributes.maxUses}</span>
                        ) : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      {license.attributes.expiry
                        ? formatDate(license.attributes.expiry)
                        : <span className="text-muted-foreground">Never</span>
                      }
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(license.attributes.created)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(license)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditLicense(license)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit License
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleValidateLicense(license)}>
                            <BadgeCheck className="mr-2 h-4 w-4" />
                            Validate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateToken(license)}>
                            <Download className="mr-2 h-4 w-4" />
                            Generate Token
                          </DropdownMenuItem>
                          {license.attributes.status === 'ACTIVE' ? (
                            <DropdownMenuItem
                              onClick={() => handleSuspendLicense(license)}
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleReinstateLicense(license)}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Reinstate
                            </DropdownMenuItem>
                          )}
                          {license.attributes.status === 'EXPIRED' && (
                            <DropdownMenuItem
                              onClick={() => handleRenewLicense(license)}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Renew
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteLicense(license)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyState
                  icon={Key}
                  colSpan={7}
                  title="No licenses found"
                  description={
                    searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Get started by creating your first license'
                  }
                />
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && (
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={totalCount}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      {selectedLicense && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete License"
          description={
            <>
              This will permanently remove{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                {selectedLicense.attributes.name || selectedLicense.attributes.key.substring(0, 20) + '...'}
              </code>{' '}
              and automatically delete all associated machines. Users will lose access
              immediately and cannot reactivate using this license key.
            </>
          }
          confirmLabel="Delete License"
          destructive
          loading={deleting}
          onConfirm={confirmDeleteLicense}
        />
      )}

      {/* Edit Dialog */}
      {selectedLicense && (
        <EditLicenseDialog
          license={selectedLicense}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onLicenseUpdated={handleRefresh}
        />
      )}

      {/* Details Dialog */}
      {selectedLicense && (
        <LicenseDetailsDialog
          license={selectedLicense}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          onLicenseUpdated={handleRefresh}
        />
      )}

      {/* Generate Activation Token Dialog */}
      {selectedLicense && (
        <GenerateActivationTokenDialog
          license={selectedLicense}
          open={tokenDialogOpen}
          onOpenChange={setTokenDialogOpen}
        />
      )}
    </div>
  )
}
