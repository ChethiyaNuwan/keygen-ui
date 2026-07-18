'use client'

import { useState, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Group, KeygenListResponse } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Users, Trash2, Edit, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDate } from '@/lib/utils/format'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useDebounce } from '@/hooks/use-debounce'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { CreateGroupDialog } from './create-group-dialog'
import { EditGroupDialog } from './edit-group-dialog'
import { GroupDetailsDialog } from './group-details-dialog'

const SEARCH_DEBOUNCE_MS = 300

export function GroupManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  const api = getKeygenApi()
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)

  // GroupsController registers no has_scope calls at all — the name/
  // maxLicenses/maxMachines/maxUsers params GroupResource.list() sends were
  // never read server-side. Only search_name exists as a Group scope, so
  // that's the one filter that can actually work under real pagination.
  const fetchGroups = useCallback(async (page: number, pageSize: number): Promise<KeygenListResponse<Group>> => {
    try {
      const trimmed = debouncedSearch.trim()
      if (trimmed.length >= 3) {
        return await api.search.search<Group>({
          type: 'groups',
          query: { name: trimmed },
          page: { size: pageSize, number: page },
        })
      }

      return await api.groups.list({ page: { size: pageSize, number: page } })
    } catch (error: unknown) {
      handleLoadError(error, 'groups')
      return { data: [], meta: { count: 0 } }
    }
  }, [api.groups, api.search, debouncedSearch])

  const {
    data: groups,
    loading,
    page: currentPage,
    setPage: setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    reload: loadGroups,
  } = usePaginatedList<Group>({
    fetcher: fetchGroups,
    resetOn: [debouncedSearch],
  })

  const handleEdit = (group: Group) => {
    setSelectedGroup(group)
    setEditDialogOpen(true)
  }

  const handleDelete = (group: Group) => {
    setSelectedGroup(group)
    setDeleteDialogOpen(true)
  }

  const handleViewDetails = (group: Group) => {
    setSelectedGroup(group)
    setDetailsDialogOpen(true)
  }

  const handleGroupCreated = () => {
    setCreateDialogOpen(false)
    loadGroups()
    toast.success('Group created successfully')
  }

  const handleGroupUpdated = () => {
    setEditDialogOpen(false)
    setSelectedGroup(null)
    loadGroups()
    toast.success('Group updated successfully')
  }

  const confirmDeleteGroup = async () => {
    if (!selectedGroup) return
    try {
      setDeleting(true)
      await api.groups.delete(selectedGroup.id)
      toast.success('Group deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedGroup(null)
      await loadGroups()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Group', {
        onNotFound: () => { setDeleteDialogOpen(false); loadGroups() },
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
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">
            Organize users and licenses into groups for easier management
          </p>
        </div>
        {/* Icon-only on phones: the label pushes the header out of shape. */}
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2 max-sm:size-9 max-sm:px-0"
          aria-label="Create Group"
        >
          <Plus className="h-4 w-4" />
          <span className="max-sm:hidden">Create Group</span>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Groups</CardTitle>
          <CardDescription>Find groups by name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Groups ({totalCount})
          </CardTitle>
          <CardDescription>
            Manage your groups and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Max Licenses</TableHead>
                <TableHead>Max Machines</TableHead>
                <TableHead>Max Users</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={Math.min(pageSize, 10)} columns={6} />
              ) : groups.length > 0 ? (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.attributes.name}</TableCell>
                    <TableCell>
                      {group.attributes.maxLicenses ? (
                        <Badge variant="secondary">{group.attributes.maxLicenses}</Badge>
                      ) : (
                        <Badge variant="outline">Unlimited</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {group.attributes.maxMachines ? (
                        <Badge variant="secondary">{group.attributes.maxMachines}</Badge>
                      ) : (
                        <Badge variant="outline">Unlimited</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {group.attributes.maxUsers ? (
                        <Badge variant="secondary">{group.attributes.maxUsers}</Badge>
                      ) : (
                        <Badge variant="outline">Unlimited</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(group.attributes.created)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(group)} className="gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(group)} className="gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(group)}
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
                  icon={Users}
                  colSpan={6}
                  title="No groups found"
                  description={searchTerm ? 'Try adjusting your search' : 'Create a group to get started'}
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
      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGroupCreated={handleGroupCreated}
      />

      {selectedGroup && (
        <>
          <EditGroupDialog
            group={selectedGroup}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onGroupUpdated={handleGroupUpdated}
          />
          <ConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Delete Group"
            description={
              <>
                Deleting{' '}
                <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                  {selectedGroup.attributes.name}
                </code>{' '}
                will remove all user and license associations. Users and licenses themselves
                will not be deleted, but they will no longer be part of this group.
              </>
            }
            confirmLabel="Delete Group"
            destructive
            loading={deleting}
            onConfirm={confirmDeleteGroup}
          />
          <GroupDetailsDialog
            group={selectedGroup}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
          />
        </>
      )}
    </div>
  )
}
