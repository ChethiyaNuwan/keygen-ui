'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Machine, KeygenListResponse } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Monitor,
  Activity,
  AlertCircle,
  CheckCircle,
  Trash2,
  Key,
  Copy,
  Cpu,
  Eye,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDateTime } from '@/lib/utils/format'
import { StatusBadge, StatusTone } from '@/components/shared/status-badge'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useDebounce } from '@/hooks/use-debounce'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { ActivateMachineDialog } from './activate-machine-dialog'
import { MachineDetailsDialog } from './machine-details-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const SEARCH_DEBOUNCE_MS = 300

export function MachineManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const api = getKeygenApi()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [pendingMachine, setPendingMachine] = useState<Machine | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)

  // Server-side heartbeat scope only recognizes ALIVE/DEAD (verified against
  // Machine#with_status in keygen-api) — there is no server-side "not
  // started" scope, so that option was dropped from the filter rather than
  // silently returning zero rows the way the old client-side-only version did.
  const fetchMachines = useCallback(async (page: number, pageSize: number): Promise<KeygenListResponse<Machine>> => {
    try {
      const trimmed = debouncedSearch.trim()
      if (trimmed.length >= 3) {
        const query: Record<string, string> = { name: trimmed, fingerprint: trimmed }
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(trimmed)) query.id = trimmed
        return await api.search.search<Machine>({
          type: 'machines',
          query,
          op: 'OR',
          page: { size: pageSize, number: page },
        })
      }

      return await api.machines.list({
        page: { size: pageSize, number: page },
        ...(statusFilter === 'active' && { status: 'ALIVE' }),
        ...(statusFilter === 'inactive' && { status: 'DEAD' }),
      })
    } catch (error: unknown) {
      handleLoadError(error, 'machines')
      return { data: [], meta: { count: 0 } }
    }
  }, [api.machines, api.search, statusFilter, debouncedSearch])

  const {
    data: machines,
    loading,
    page: currentPage,
    setPage: setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    reload: loadMachines,
  } = usePaginatedList<Machine>({
    fetcher: fetchMachines,
    resetOn: [statusFilter, debouncedSearch],
  })

  const clearSearch = () => {
    setSearchTerm('')
    searchInputRef.current?.focus()
  }

  // Account-wide alive/dead counts for the stats cards — the server has no
  // scope for "not started" (it folds into alive/dead depending on the
  // heartbeat grace window), so that card stays scoped to the current page.
  const [accountStats, setAccountStats] = useState({ alive: 0, dead: 0, loading: true })

  const loadAccountStats = useCallback(async () => {
    try {
      setAccountStats(prev => ({ ...prev, loading: true }))
      const [aliveResponse, deadResponse] = await Promise.all([
        api.machines.list({ limit: 1, status: 'ALIVE' }),
        api.machines.list({ limit: 1, status: 'DEAD' }),
      ])
      setAccountStats({
        alive: aliveResponse.meta?.count ?? 0,
        dead: deadResponse.meta?.count ?? 0,
        loading: false,
      })
    } catch {
      setAccountStats(prev => ({ ...prev, loading: false }))
    }
  }, [api.machines])

  useEffect(() => {
    loadAccountStats()
  }, [loadAccountStats])

  const notStartedOnPage = machines.filter(m => m.attributes.heartbeatStatus === 'NOT_STARTED').length

  const getHeartbeatTone = (heartbeatStatus: string): StatusTone => {
    switch (heartbeatStatus) {
      case 'ALIVE': return 'success'
      case 'DEAD': return 'danger'
      default: return 'neutral'
    }
  }

  const getStatusIcon = (heartbeatStatus: string) => {
    switch (heartbeatStatus) {
      case 'ALIVE': return <CheckCircle className="h-3 w-3" />
      case 'DEAD': return <AlertCircle className="h-3 w-3" />
      case 'NOT_STARTED': return <Activity className="h-3 w-3" />
      default: return <Activity className="h-3 w-3" />
    }
  }

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadMachines(), loadAccountStats()])
  }, [loadMachines, loadAccountStats])

  const handleDeleteMachine = (machine: Machine) => {
    setPendingMachine(machine)
    setConfirmDeleteOpen(true)
  }

  const handleViewDetails = (machine: Machine) => {
    setSelectedMachine(machine)
    setDetailsDialogOpen(true)
  }

  const handlePingMachine = async (machine: Machine) => {
    try {
      await api.machines.ping(machine.id)
      await handleRefresh()
      toast.success('Heartbeat ping sent')
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Machine', { customMessage: 'Failed to ping machine' })
    }
  }

  const confirmDeleteMachine = async () => {
    if (!pendingMachine) return
    setConfirmLoading(true)
    try {
      await api.machines.deactivate(pendingMachine.id)
      await handleRefresh()
      toast.success('Machine deleted successfully')
      setConfirmDeleteOpen(false)
      setPendingMachine(null)
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Machine', {
        customMessage: 'Failed to delete machine'
      })
    } finally {
      setConfirmLoading(false)
    }
  }

  const copyFingerprint = (fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint)
    toast.success('Machine fingerprint copied to clipboard')
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success('Machine ID copied to clipboard')
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Machines</h1>
          <p className="text-muted-foreground">
            Monitor and manage licensed machines
          </p>
        </div>
        <ActivateMachineDialog onMachineActivated={handleRefresh} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              Registered machines
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountStats.loading ? '...' : accountStats.alive}</div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountStats.loading ? '...' : accountStats.dead}</div>
            <p className="text-xs text-muted-foreground">
              Offline machines
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started (this page)</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notStartedOnPage}</div>
            <p className="text-xs text-muted-foreground">
              Never activated
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
            placeholder="Search by fingerprint or name..."
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
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Machines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Machine List</CardTitle>
          <CardDescription>
            A list of all registered machines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fingerprint</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>Last Heartbeat</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={Math.min(pageSize, 10)} columns={8} />
              ) : machines.length > 0 ? (
                machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-muted px-1 rounded">
                          {machine.attributes.fingerprint?.substring(0, 12)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyFingerprint(machine.attributes.fingerprint || '')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {machine.attributes.name || 'Unnamed Machine'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={getHeartbeatTone(machine.attributes.heartbeatStatus)}
                        icon={getStatusIcon(machine.attributes.heartbeatStatus)}
                      >
                        {machine.attributes.heartbeatStatus?.replace('_', ' ').toLowerCase()}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {machine.attributes.ip || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {machine.attributes.hostname || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {machine.attributes.lastHeartbeat 
                        ? formatDateTime(machine.attributes.lastHeartbeat)
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      {formatDateTime(machine.attributes.created)}
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
                          <DropdownMenuItem onClick={() => handleViewDetails(machine)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePingMachine(machine)}>
                            <Activity className="mr-2 h-4 w-4" />
                            Ping
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyId(machine.id)}>
                            <Key className="mr-2 h-4 w-4" />
                            Copy Machine ID
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyFingerprint(machine.attributes.fingerprint || '')}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Fingerprint
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteMachine(machine)}
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
                  icon={Monitor}
                  colSpan={8}
                  title="No machines found"
                  description={
                    searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Machines will appear here when licenses are activated'
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
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete machine?"
        description="Are you sure you want to delete this machine? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={confirmLoading}
        onConfirm={confirmDeleteMachine}
      />
      {selectedMachine && (
        <MachineDetailsDialog
          machine={selectedMachine}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          onMachineUpdated={handleRefresh}
        />
      )}
    </div>
  )
}
