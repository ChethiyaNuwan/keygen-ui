'use client'

import { useState, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Entitlement, KeygenListResponse } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Shield, Trash2, Edit, Eye, Code } from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDate } from '@/lib/utils/format'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useDebounce } from '@/hooks/use-debounce'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { CreateEntitlementDialog } from './create-entitlement-dialog'
import { EditEntitlementDialog } from './edit-entitlement-dialog'
import { EntitlementDetailsDialog } from './entitlement-details-dialog'

const SEARCH_DEBOUNCE_MS = 300

export function EntitlementManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedEntitlement, setSelectedEntitlement] = useState<Entitlement | null>(null)

  const api = getKeygenApi()
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)

  // EntitlementsController registers no has_scope calls at all — the name/
  // code params EntitlementResource.list() builds were never read
  // server-side. search_name and search_code both exist as scopes though,
  // so search (which used to match either client-side) is wired up as an OR
  // search across both, same pattern as machines' name-or-fingerprint search.
  const fetchEntitlements = useCallback(async (page: number, pageSize: number): Promise<KeygenListResponse<Entitlement>> => {
    try {
      const trimmed = debouncedSearch.trim()
      if (trimmed.length >= 3) {
        return await api.search.search<Entitlement>({
          type: 'entitlements',
          query: { name: trimmed, code: trimmed },
          op: 'OR',
          page: { size: pageSize, number: page },
        })
      }

      return await api.entitlements.list({ page: { size: pageSize, number: page } })
    } catch (error: unknown) {
      handleLoadError(error, 'entitlements')
      return { data: [], meta: { count: 0 } }
    }
  }, [api.entitlements, api.search, debouncedSearch])

  const {
    data: entitlements,
    loading,
    page: currentPage,
    setPage: setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    reload: loadEntitlements,
  } = usePaginatedList<Entitlement>({
    fetcher: fetchEntitlements,
    resetOn: [debouncedSearch],
  })

  const handleEdit = (entitlement: Entitlement) => {
    setSelectedEntitlement(entitlement)
    setEditDialogOpen(true)
  }

  const handleDelete = (entitlement: Entitlement) => {
    setSelectedEntitlement(entitlement)
    setDeleteDialogOpen(true)
  }

  const handleViewDetails = (entitlement: Entitlement) => {
    setSelectedEntitlement(entitlement)
    setDetailsDialogOpen(true)
  }

  const handleEntitlementCreated = () => {
    setCreateDialogOpen(false)
    loadEntitlements()
    toast.success('Entitlement created successfully')
  }

  const handleEntitlementUpdated = () => {
    setEditDialogOpen(false)
    setSelectedEntitlement(null)
    loadEntitlements()
    toast.success('Entitlement updated successfully')
  }

  const confirmDeleteEntitlement = async () => {
    if (!selectedEntitlement) return
    try {
      setDeleting(true)
      await api.entitlements.delete(selectedEntitlement.id)
      toast.success('Entitlement deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedEntitlement(null)
      await loadEntitlements()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Entitlement', {
        onNotFound: () => { setDeleteDialogOpen(false); loadEntitlements() },
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entitlements</h1>
          <p className="text-muted-foreground">
            Manage feature entitlements and permissions for your products
          </p>
        </div>
        {/* Icon-only on phones: the label pushes the header out of shape. */}
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2 max-sm:size-9 max-sm:px-0"
          aria-label="Create Entitlement"
        >
          <Plus className="h-4 w-4" />
          <span className="max-sm:hidden">Create Entitlement</span>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Entitlements</CardTitle>
          <CardDescription>Find entitlements by name or code</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entitlements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Entitlements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Entitlements ({totalCount})
          </CardTitle>
          <CardDescription>
            Manage feature toggles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={Math.min(pageSize, 10)} columns={5} />
              ) : entitlements.length > 0 ? (
                entitlements.map((entitlement) => (
                  <TableRow key={entitlement.id}>
                    <TableCell className="font-medium">{entitlement.attributes.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        <Code className="h-3 w-3 mr-1" />
                        {entitlement.attributes.code}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(entitlement.attributes.created)}</TableCell>
                    <TableCell>{formatDate(entitlement.attributes.updated)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(entitlement)} className="gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(entitlement)} className="gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(entitlement)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
                  colSpan={5}
                  title="No entitlements found"
                  description={searchTerm ? 'Try adjusting your search' : 'Create an entitlement to get started'}
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

      {/* Dialogs */}
      <CreateEntitlementDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onEntitlementCreated={handleEntitlementCreated}
      />

      {selectedEntitlement && (
        <>
          <EditEntitlementDialog
            entitlement={selectedEntitlement}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onEntitlementUpdated={handleEntitlementUpdated}
          />
          <ConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Delete Entitlement"
            description={
              <>
                Deleting{' '}
                <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                  {selectedEntitlement.attributes.name}
                </code>{' '}
                will remove it from all associated licenses. This may affect your users&apos;
                access to features controlled by this entitlement.
              </>
            }
            confirmLabel="Delete Entitlement"
            destructive
            loading={deleting}
            onConfirm={confirmDeleteEntitlement}
          />
          <EntitlementDetailsDialog
            entitlement={selectedEntitlement}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
          />
        </>
      )}
    </div>
  )
}
