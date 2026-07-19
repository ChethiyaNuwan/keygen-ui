'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { EventLog, RequestLog } from '@/lib/types/keygen'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Eye, History, Activity } from 'lucide-react'
import { handleLoadError } from '@/lib/utils/error-handling'
import { formatDateTime } from '@/lib/utils/format'
import { StatusBadge, StatusTone } from '@/components/shared/status-badge'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { RequestLogDetailsSheet } from './request-log-details-sheet'

const PAGE_SIZE = 25

function statusTone(status: number): StatusTone {
  if (status >= 500) return 'danger'
  if (status >= 400) return 'warning'
  return 'success'
}

export function LogManagement() {
  const api = getKeygenApi()

  // Event logs
  const [eventLogs, setEventLogs] = useState<EventLog[]>([])
  const [eventLoading, setEventLoading] = useState(true)
  const [eventPage, setEventPage] = useState(1)
  const [eventTotalCount, setEventTotalCount] = useState(0)
  const [eventDateStart, setEventDateStart] = useState('')
  const [eventDateEnd, setEventDateEnd] = useState('')

  // Request logs
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([])
  const [requestLoading, setRequestLoading] = useState(true)
  const [requestPage, setRequestPage] = useState(1)
  const [requestTotalCount, setRequestTotalCount] = useState(0)
  const [requestDateStart, setRequestDateStart] = useState('')
  const [requestDateEnd, setRequestDateEnd] = useState('')
  const [selectedRequestLog, setSelectedRequestLog] = useState<RequestLog | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const loadEventLogs = useCallback(async () => {
    try {
      setEventLoading(true)
      const response = await api.eventLogs.list({
        page: { size: PAGE_SIZE, number: eventPage },
        ...((eventDateStart || eventDateEnd) && {
          date: {
            ...(eventDateStart && { start: new Date(eventDateStart).toISOString() }),
            ...(eventDateEnd && { end: new Date(eventDateEnd).toISOString() }),
          },
        }),
      })
      setEventLogs(response.data || [])
      setEventTotalCount(response.meta?.count ?? 0)
    } catch (error: unknown) {
      handleLoadError(error, 'event logs')
    } finally {
      setEventLoading(false)
    }
  }, [api.eventLogs, eventPage, eventDateStart, eventDateEnd])

  const loadRequestLogs = useCallback(async () => {
    try {
      setRequestLoading(true)
      const response = await api.requestLogs.list({
        page: { size: PAGE_SIZE, number: requestPage },
        ...((requestDateStart || requestDateEnd) && {
          date: {
            ...(requestDateStart && { start: new Date(requestDateStart).toISOString() }),
            ...(requestDateEnd && { end: new Date(requestDateEnd).toISOString() }),
          },
        }),
      })
      setRequestLogs(response.data || [])
      setRequestTotalCount(response.meta?.count ?? 0)
    } catch (error: unknown) {
      handleLoadError(error, 'request logs')
    } finally {
      setRequestLoading(false)
    }
  }, [api.requestLogs, requestPage, requestDateStart, requestDateEnd])

  useEffect(() => {
    loadEventLogs()
  }, [loadEventLogs])

  useEffect(() => {
    loadRequestLogs()
  }, [loadRequestLogs])

  useEffect(() => {
    setEventPage(1)
  }, [eventDateStart, eventDateEnd])

  useEffect(() => {
    setRequestPage(1)
  }, [requestDateStart, requestDateEnd])

  const eventTotalPages = Math.max(1, Math.ceil(eventTotalCount / PAGE_SIZE))
  const requestTotalPages = Math.max(1, Math.ceil(requestTotalCount / PAGE_SIZE))

  const handleViewRequestLog = (log: RequestLog) => {
    setSelectedRequestLog(log)
    setDetailsOpen(true)
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
        <p className="text-muted-foreground">
          Account activity and API request history
        </p>
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">
            <History className="mr-2 h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Activity className="mr-2 h-4 w-4" />
            Requests
          </TabsTrigger>
        </TabsList>

        {/* Event Logs */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Event Logs</CardTitle>
              <div className="flex flex-wrap items-end gap-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="event-date-start" className="text-xs">From</Label>
                  <Input
                    id="event-date-start"
                    type="date"
                    value={eventDateStart}
                    onChange={(e) => setEventDateStart(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="event-date-end" className="text-xs">To</Label>
                  <Input
                    id="event-date-end"
                    type="date"
                    value={eventDateEnd}
                    onChange={(e) => setEventDateEnd(e.target.value)}
                    className="w-40"
                  />
                </div>
                {(eventDateStart || eventDateEnd) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEventDateStart('')
                      setEventDateEnd('')
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Event</TableHead>
                    <TableHead>Metadata</TableHead>
                    <TableHead className="pr-6">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventLoading ? (
                    <TableSkeleton rows={Math.min(PAGE_SIZE, 10)} columns={3} />
                  ) : eventLogs.length > 0 ? (
                    eventLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="pl-6">
                          <Badge variant="outline">{log.attributes.event}</Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          {log.attributes.metadata && Object.keys(log.attributes.metadata).length > 0 ? (
                            <code className="text-xs text-muted-foreground truncate block">
                              {JSON.stringify(log.attributes.metadata)}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-muted-foreground">
                          {formatDateTime(log.attributes.created)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyState
                      icon={History}
                      colSpan={3}
                      title="No event logs found"
                      description={
                        eventDateStart || eventDateEnd
                          ? 'Try adjusting the date range'
                          : 'Account activity will appear here as it happens'
                      }
                    />
                  )}
                </TableBody>
              </Table>

              {!eventLoading && eventTotalCount > 0 && (
                <div className="flex items-center justify-between border-t px-6 pt-4 mt-2">
                  <span className="text-sm text-muted-foreground">
                    Page {eventPage} of {eventTotalPages} · {eventTotalCount} total
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={eventPage === 1}
                      onClick={() => setEventPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={eventPage === eventTotalPages}
                      onClick={() => setEventPage((p) => Math.min(eventTotalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Request Logs */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Request Logs</CardTitle>
              <div className="flex flex-wrap items-end gap-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="request-date-start" className="text-xs">From</Label>
                  <Input
                    id="request-date-start"
                    type="date"
                    value={requestDateStart}
                    onChange={(e) => setRequestDateStart(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="request-date-end" className="text-xs">To</Label>
                  <Input
                    id="request-date-end"
                    type="date"
                    value={requestDateEnd}
                    onChange={(e) => setRequestDateEnd(e.target.value)}
                    className="w-40"
                  />
                </div>
                {(requestDateStart || requestDateEnd) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRequestDateStart('')
                      setRequestDateEnd('')
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Method</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="pr-6 w-[70px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestLoading ? (
                    <TableSkeleton rows={Math.min(PAGE_SIZE, 10)} columns={6} />
                  ) : requestLogs.length > 0 ? (
                    requestLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="pl-6">
                          <Badge variant="outline">{log.attributes.method}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <code className="text-xs truncate block">{log.attributes.url}</code>
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={statusTone(log.attributes.status)}>
                            {log.attributes.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.attributes.ip || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(log.attributes.created)}
                        </TableCell>
                        <TableCell className="pr-6">
                          <Button variant="ghost" size="sm" onClick={() => handleViewRequestLog(log)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyState
                      icon={Activity}
                      colSpan={6}
                      title="No request logs found"
                      description={
                        requestDateStart || requestDateEnd
                          ? 'Try adjusting the date range'
                          : 'API requests will appear here as they happen'
                      }
                    />
                  )}
                </TableBody>
              </Table>

              {!requestLoading && requestTotalCount > 0 && (
                <div className="flex items-center justify-between border-t px-6 pt-4 mt-2">
                  <span className="text-sm text-muted-foreground">
                    Page {requestPage} of {requestTotalPages} · {requestTotalCount} total
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={requestPage === 1}
                      onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={requestPage === requestTotalPages}
                      onClick={() => setRequestPage((p) => Math.min(requestTotalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RequestLogDetailsSheet
        log={selectedRequestLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  )
}
