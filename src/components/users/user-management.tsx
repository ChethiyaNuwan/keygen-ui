'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getKeygenApi } from '@/lib/api'
import { User, KeygenListResponse } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Users,
  UserCheck,
  UserX,
  Shield,
  Edit,
  Trash2,
  Mail,
  Calendar,
  Ban,
  CheckCircle,
  Eye,
  X,
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
import { CreateUserDialog } from './create-user-dialog'
import { EditUserDialog } from './edit-user-dialog'
import { UserDetailsDialog } from './user-details-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const SEARCH_DEBOUNCE_MS = 300

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const api = getKeygenApi()
  const [confirmBanOpen, setConfirmBanOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [pendingUser, setPendingUser] = useState<User | null>(null)
  const [pendingAction, setPendingAction] = useState<'ban' | 'unban' | 'delete' | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)

  const fetchUsers = useCallback(async (page: number, pageSize: number): Promise<KeygenListResponse<User>> => {
    try {
      const trimmed = debouncedSearch.trim()
      if (trimmed.length >= 3) {
        const query: Record<string, string> = { email: trimmed, firstName: trimmed, lastName: trimmed }
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(trimmed)) query.id = trimmed
        return await api.search.search<User>({
          type: 'users',
          query,
          op: 'OR',
          page: { size: pageSize, number: page },
        })
      }

      return await api.users.list({
        page: { size: pageSize, number: page },
        ...(statusFilter === 'active' && { status: 'ACTIVE' }),
        ...(statusFilter === 'banned' && { status: 'BANNED' }),
      })
    } catch (error: unknown) {
      handleLoadError(error, 'users')
      return { data: [], meta: { count: 0 } }
    }
  }, [api.users, api.search, statusFilter, debouncedSearch])

  const {
    data: users,
    loading,
    page: currentPage,
    setPage: setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    reload: loadUsers,
  } = usePaginatedList<User>({
    fetcher: fetchUsers,
    resetOn: [statusFilter, debouncedSearch],
  })

  const clearSearch = () => {
    setSearchTerm('')
    searchInputRef.current?.focus()
  }

  // Account-wide counts for the stats cards.
  const [accountStats, setAccountStats] = useState({ active: 0, banned: 0, admins: 0, loading: true })

  const loadAccountStats = useCallback(async () => {
    try {
      setAccountStats(prev => ({ ...prev, loading: true }))
      const [activeResponse, bannedResponse, adminsResponse] = await Promise.all([
        api.users.list({ limit: 1, status: 'ACTIVE' }),
        api.users.list({ limit: 1, status: 'BANNED' }),
        api.users.list({ limit: 1, roles: ['admin'] }),
      ])
      setAccountStats({
        active: activeResponse.meta?.count ?? 0,
        banned: bannedResponse.meta?.count ?? 0,
        admins: adminsResponse.meta?.count ?? 0,
        loading: false,
      })
    } catch {
      setAccountStats(prev => ({ ...prev, loading: false }))
    }
  }, [api.users])

  useEffect(() => {
    loadAccountStats()
  }, [loadAccountStats])

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadUsers(), loadAccountStats()])
  }, [loadUsers, loadAccountStats])

  const getBannedTone = (banned: boolean): StatusTone => (banned ? 'danger' : 'success')

  const getStatusIcon = (banned: boolean) => {
    return banned
      ? <Ban className="h-3 w-3" />
      : <CheckCircle className="h-3 w-3" />
  }

  const handleBanUser = (user: User) => {
    setPendingUser(user)
    setPendingAction(user.attributes.banned ? 'unban' : 'ban')
    setConfirmBanOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setPendingUser(user)
    setPendingAction('delete')
    setConfirmDeleteOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditDialogOpen(true)
  }

  const handleViewDetails = (user: User) => {
    setSelectedUser(user)
    setDetailsDialogOpen(true)
  }

  const executePendingAction = async () => {
    if (!pendingUser || !pendingAction) return
    setConfirmLoading(true)
    try {
      if (pendingAction === 'ban') {
        await api.users.ban(pendingUser.id)
        toast.success('User banned successfully')
      } else if (pendingAction === 'unban') {
        await api.users.unban(pendingUser.id)
        toast.success('User unbanned successfully')
      } else if (pendingAction === 'delete') {
        await api.users.delete(pendingUser.id)
        toast.success('User deleted successfully')
      }
      await handleRefresh()
      setConfirmBanOpen(false)
      setConfirmDeleteOpen(false)
      setPendingUser(null)
      setPendingAction(null)
    } catch (error: unknown) {
      const action = pendingAction === 'delete' ? 'delete' : 'update'
      const custom = pendingAction === 'delete' ? 'Failed to delete user' : `Failed to ${pendingAction} user`
      handleCrudError(error, action as 'delete' | 'update', 'User', { customMessage: custom })
    } finally {
      setConfirmLoading(false)
    }
  }

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    if (email) {
      return email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getFullName = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    if (firstName) return firstName
    if (lastName) return lastName
    return 'Unknown User'
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <CreateUserDialog onUserCreated={handleRefresh} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountStats.loading ? '...' : accountStats.active}</div>
            <p className="text-xs text-muted-foreground">
              Active users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banned</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountStats.loading ? '...' : accountStats.banned}</div>
            <p className="text-xs text-muted-foreground">
              Banned users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountStats.loading ? '...' : accountStats.admins}</div>
            <p className="text-xs text-muted-foreground">
              Administrator users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative basis-full sm:basis-auto flex-1 sm:max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-8"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-[150px] sm:flex-none">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>
            A list of all users in your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={Math.min(pageSize, 10)} columns={7} />
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-muted text-xs">
                            {getInitials(user.attributes.firstName, user.attributes.lastName, user.attributes.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {getFullName(user.attributes.firstName, user.attributes.lastName)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {user.attributes.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.attributes.role === 'admin' ? 'default' : 'secondary'}>
                        {user.attributes.role || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={getBannedTone(user.attributes.banned || false)}
                        icon={getStatusIcon(user.attributes.banned || false)}
                      >
                        {user.attributes.banned ? 'Banned' : 'Active'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(user.attributes.created)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.attributes.lastSignedInAt 
                        ? formatDate(user.attributes.lastSignedInAt)
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBanUser(user)}>
                            {user.attributes.banned ? (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Unban User
                              </>
                            ) : (
                              <>
                                <Ban className="mr-2 h-4 w-4" />
                                Ban User
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteUser(user)}
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
                  icon={Users}
                  colSpan={7}
                  title="No users found"
                  description={
                    searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Get started by creating your first user'
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

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmBanOpen}
        onOpenChange={setConfirmBanOpen}
        title={pendingAction === 'unban' ? 'Unban user?' : 'Ban user?'}
        description={pendingUser ? `Are you sure you want to ${pendingAction} ${pendingUser.attributes.email}?` : ''}
        confirmLabel={pendingAction === 'unban' ? 'Unban' : 'Ban'}
        destructive={pendingAction === 'ban'}
        loading={confirmLoading}
        onConfirm={executePendingAction}
      />
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete user?"
        description={pendingUser ? `Are you sure you want to delete ${pendingUser.attributes.email}? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        destructive
        loading={confirmLoading}
        onConfirm={executePendingAction}
      />

      {/* Edit Dialog */}
      {selectedUser && (
        <EditUserDialog
          user={selectedUser}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUserUpdated={handleRefresh}
        />
      )}

      {/* Details Dialog */}
      {selectedUser && (
        <UserDetailsDialog
          user={selectedUser}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </div>
  )
}
