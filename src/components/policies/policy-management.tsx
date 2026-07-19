'use client'

import { useState, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Policy, KeygenListResponse } from '@/lib/types/keygen'
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
  Search,
  MoreVertical,
  Shield,
  Users,
  Settings,
  Trash2,
  Edit,
  Clock,
  Eye,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDate } from '@/lib/utils/format'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useDebounce } from '@/hooks/use-debounce'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { CreatePolicyDialog } from './create-policy-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EditPolicyDialog } from './edit-policy-dialog'
import { PolicyDetailsDialog } from './policy-details-dialog'

const SEARCH_DEBOUNCE_MS = 300

export function PolicyManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [policyToEdit, setPolicyToEdit] = useState<Policy | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [policyToView, setPolicyToView] = useState<Policy | null>(null)
  const api = getKeygenApi()

  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)

  // Keygen's PoliciesController only registers a server-side scope for
  // `product` (has_scope(:product)) — there is no scope for floating/strict/
  // protected/duration, so a type filter can't be applied server-side. Rather
  // than filtering only the current page (which would silently hide matches
  // sitting on other pages), the type filter dropdown was dropped; the stat
  // cards below are relabeled "this page" instead, same treatment as
  // machines' "Not Started" card.
  const fetchPolicies = useCallback(async (page: number, pageSize: number): Promise<KeygenListResponse<Policy>> => {
    try {
      const trimmed = debouncedSearch.trim()
      if (trimmed.length >= 3) {
        return await api.search.search<Policy>({
          type: 'policies',
          query: { name: trimmed },
          page: { size: pageSize, number: page },
        })
      }

      return await api.policies.list({ page: { size: pageSize, number: page } })
    } catch (error: unknown) {
      handleLoadError(error, 'policies')
      return { data: [], meta: { count: 0 } }
    }
  }, [api.policies, api.search, debouncedSearch])

  const {
    data: policies,
    loading,
    page: currentPage,
    setPage: setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    reload: loadPolicies,
  } = usePaginatedList<Policy>({
    fetcher: fetchPolicies,
    resetOn: [debouncedSearch],
  })

  const getExpirationText = (duration?: number) => {
    if (!duration) return 'Never expires'

    const days = Math.floor(duration / (24 * 60 * 60))
    const hours = Math.floor((duration % (24 * 60 * 60)) / (60 * 60))

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    } else {
      return `${duration} seconds`
    }
  }

  const handleDeletePolicy = (policy: Policy) => {
    setPolicyToDelete(policy)
    setDeleteDialogOpen(true)
  }

  const confirmDeletePolicy = async () => {
    if (!policyToDelete) return
    try {
      setDeleting(true)
      await api.policies.delete(policyToDelete.id)
      toast.success('Policy deleted successfully')
      setDeleteDialogOpen(false)
      await loadPolicies()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Policy', {
        onNotFound: () => { setDeleteDialogOpen(false); loadPolicies() },
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleEditPolicy = (policy: Policy) => {
    setPolicyToEdit(policy)
    setEditDialogOpen(true)
  }

  const handleViewDetails = (policy: Policy) => {
    setPolicyToView(policy)
    setDetailsDialogOpen(true)
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success('Policy ID copied to clipboard')
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policies</h1>
          <p className="text-muted-foreground">
            Manage licensing policies and rules for your products
          </p>
        </div>
        <CreatePolicyDialog onPolicyCreated={loadPolicies} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              All licensing policies
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Floating (this page)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {policies.filter(p => p.attributes.floating).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-device licenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protected (this page)</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {policies.filter(p => p.attributes.protected).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Write-protected policies
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timed (this page)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {policies.filter(p => p.attributes.duration).length}
            </div>
            <p className="text-xs text-muted-foreground">
              With expiration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative basis-full sm:basis-auto flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Policies Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Policy List</CardTitle>
          <CardDescription>
            {totalCount} polic{totalCount === 1 ? 'y' : 'ies'} total
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={Math.min(pageSize, 10)} columns={6} />
              ) : policies.length > 0 ? (
                policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{policy.attributes.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {policy.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {policy.attributes.floating && (
                          <Badge variant="outline" className="text-xs">
                            Floating
                          </Badge>
                        )}
                        {policy.attributes.strict && (
                          <Badge variant="outline" className="text-xs">
                            Strict
                          </Badge>
                        )}
                        {policy.attributes.protected && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                            Protected
                          </Badge>
                        )}
                        {policy.attributes.requireHeartbeat && (
                          <Badge variant="outline" className="text-xs">
                            Heartbeat
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${policy.attributes.duration ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {getExpirationText(policy.attributes.duration)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {policy.attributes.maxMachines && (
                          <div>Machines: {policy.attributes.maxMachines}</div>
                        )}
                        {policy.attributes.maxProcesses && (
                          <div>Processes: {policy.attributes.maxProcesses}</div>
                        )}
                        {policy.attributes.maxUses && (
                          <div>Uses: {policy.attributes.maxUses}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(policy.attributes.created)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(policy)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyId(policy.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditPolicy(policy)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Policy
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeletePolicy(policy)}
                            className="text-red-600"
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
                  icon={Shield}
                  colSpan={6}
                  title="No policies found"
                  description={
                    searchTerm
                      ? 'Try adjusting your search'
                      : 'Create a policy to define licensing rules for your products'
                  }
                />
              )}
            </TableBody>
          </Table>

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
      {policyToDelete && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Policy"
          description={
            <>
              This will permanently remove{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                {policyToDelete.attributes.name}
              </code>{' '}
              and may affect any licenses that depend on it. Make sure no active licenses are
              using this policy before deletion.
            </>
          }
          confirmLabel="Delete Policy"
          destructive
          loading={deleting}
          onConfirm={confirmDeletePolicy}
        />
      )}

      {/* Edit Dialog */}
      {policyToEdit && (
        <EditPolicyDialog
          policy={policyToEdit}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onPolicyUpdated={loadPolicies}
        />
      )}

      {/* Details Dialog */}
      {policyToView && (
        <PolicyDetailsDialog
          policy={policyToView}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </div>
  )
}
