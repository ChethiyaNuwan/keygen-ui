'use client'

import { useState, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Webhook, KeygenListResponse } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Webhook as WebhookIcon, Trash2, Edit, Eye, TestTube } from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDate } from '@/lib/utils/format'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { CreateWebhookDialog } from './create-webhook-dialog'
import { EditWebhookDialog } from './edit-webhook-dialog'
import { WebhookDetailsDialog } from './webhook-details-dialog'

export function WebhookManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)

  const api = getKeygenApi()

  // Webhooks have no server-side search at all: `webhook-endpoints` isn't in
  // SearchableType (verified against SearchesController's SEARCH_MODELS in
  // keygen-api, which omits it), and WebhookEndpointsController registers no
  // has_scope calls either, so `url` filters in WebhookFilters were always
  // dead too. No filter UI to migrate — just pagination.
  const fetchWebhooks = useCallback(async (page: number, pageSize: number): Promise<KeygenListResponse<Webhook>> => {
    try {
      return await api.webhooks.list({ page: { size: pageSize, number: page } })
    } catch (error: unknown) {
      handleLoadError(error, 'webhooks')
      return { data: [], meta: { count: 0 } }
    }
  }, [api.webhooks])

  const {
    data: webhooks,
    loading,
    page: currentPage,
    setPage: setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    reload: loadWebhooks,
  } = usePaginatedList<Webhook>({
    fetcher: fetchWebhooks,
  })

  const handleTestWebhook = async (webhook: Webhook) => {
    try {
      await api.webhooks.test(webhook.id)
      toast.success('Test webhook sent successfully')
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Webhook', {
        customMessage: 'Failed to send test webhook'
      })
    }
  }

  const handleEdit = (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setEditDialogOpen(true)
  }

  const handleDelete = (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setDeleteDialogOpen(true)
  }

  const handleViewDetails = (webhook: Webhook) => {
    setSelectedWebhook(webhook)
    setDetailsDialogOpen(true)
  }

  const handleWebhookCreated = () => {
    setCreateDialogOpen(false)
    loadWebhooks()
    toast.success('Webhook created successfully')
  }

  const handleWebhookUpdated = () => {
    setEditDialogOpen(false)
    setSelectedWebhook(null)
    loadWebhooks()
    toast.success('Webhook updated successfully')
  }

  const confirmDeleteWebhook = async () => {
    if (!selectedWebhook) return
    try {
      setDeleting(true)
      await api.webhooks.delete(selectedWebhook.id)
      toast.success('Webhook deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedWebhook(null)
      await loadWebhooks()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Webhook', {
        onNotFound: () => { setDeleteDialogOpen(false); loadWebhooks() },
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
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhook endpoints to receive real-time event notifications
          </p>
        </div>
        {/* Icon-only on phones: the label pushes the header out of shape. */}
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2 max-sm:size-9 max-sm:px-0"
          aria-label="Create Webhook"
        >
          <Plus className="h-4 w-4" />
          <span className="max-sm:hidden">Create Webhook</span>
        </Button>
      </div>

      {/* Webhooks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WebhookIcon className="h-5 w-5" />
            Webhooks ({totalCount})
          </CardTitle>
          <CardDescription>
            Manage webhook endpoints and event subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={Math.min(pageSize, 10)} columns={4} />
              ) : webhooks.length > 0 ? (
                webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <WebhookIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{webhook.attributes.url}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.attributes.subscriptions.slice(0, 3).map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                        {webhook.attributes.subscriptions.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{webhook.attributes.subscriptions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(webhook.attributes.created)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(webhook)} className="gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTestWebhook(webhook)} className="gap-2">
                            <TestTube className="h-4 w-4" />
                            Send Test
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(webhook)} className="gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(webhook)}
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
                  icon={WebhookIcon}
                  colSpan={4}
                  title="No webhooks found"
                  description="Create a webhook to receive real-time event notifications"
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
      <CreateWebhookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onWebhookCreated={handleWebhookCreated}
      />

      {selectedWebhook && (
        <>
          <EditWebhookDialog
            webhook={selectedWebhook}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onWebhookUpdated={handleWebhookUpdated}
          />
          <ConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Delete Webhook"
            description={
              <>
                Deleting the webhook for{' '}
                <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                  {selectedWebhook.attributes.url}
                </code>{' '}
                will permanently stop all event notifications to this endpoint. Any applications
                depending on these webhooks will stop receiving updates.
              </>
            }
            confirmLabel="Delete Webhook"
            destructive
            loading={deleting}
            onConfirm={confirmDeleteWebhook}
          />
          <WebhookDetailsDialog
            webhook={selectedWebhook}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
          />
        </>
      )}
    </div>
  )
}
