'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getKeygenApi } from '@/lib/api'
import { Machine, Process, Component, User, Group, MachineFile } from '@/lib/types/keygen'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Monitor, Cpu, Activity, RotateCcw, Download, Copy, Pencil, Check, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDateTime } from '@/lib/utils/format'
import { StatusBadge, StatusTone } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

interface MachineDetailsDialogProps {
  machine: Machine
  open: boolean
  onOpenChange: (open: boolean) => void
  onMachineUpdated: () => void
}

function relationshipId(machine: Machine, key: string): string | undefined {
  const rel = machine.relationships?.[key]?.data
  return rel && !Array.isArray(rel) ? rel.id : undefined
}

function isValidPositiveIntOrEmpty(value: string): boolean {
  if (!value.trim()) return true
  return /^\d+$/.test(value.trim())
}

const machineSchema = z.object({
  name: z.string(),
  platform: z.string(),
  hostname: z.string(),
  cores: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number'),
  requireHeartbeat: z.boolean(),
  heartbeatDuration: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number of seconds'),
})

type MachineFormValues = z.infer<typeof machineSchema>

function machineToFormValues(machine: Machine): MachineFormValues {
  return {
    name: machine.attributes.name ?? '',
    platform: machine.attributes.platform ?? '',
    hostname: machine.attributes.hostname ?? '',
    cores: machine.attributes.cores?.toString() ?? '',
    requireHeartbeat: machine.attributes.requireHeartbeat,
    heartbeatDuration: machine.attributes.heartbeatDuration?.toString() ?? '',
  }
}

export function MachineDetailsDialog({ machine, open, onOpenChange, onMachineUpdated }: MachineDetailsDialogProps) {
  const api = getKeygenApi()

  const form = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: machineToFormValues(machine),
  })

  const [owners, setOwners] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [relationshipsLoading, setRelationshipsLoading] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<'owner' | 'group' | null>(null)
  const [relationshipValue, setRelationshipValue] = useState('')
  const [savingRelationship, setSavingRelationship] = useState(false)

  const [processes, setProcesses] = useState<Process[]>([])
  const [components, setComponents] = useState<Component[]>([])
  const [processesLoaded, setProcessesLoaded] = useState(false)
  const [processesLoading, setProcessesLoading] = useState(false)
  const [processToKill, setProcessToKill] = useState<Process | null>(null)
  const [killDialogOpen, setKillDialogOpen] = useState(false)
  const [killing, setKilling] = useState(false)

  const [pinging, setPinging] = useState(false)
  const [resettingHeartbeat, setResettingHeartbeat] = useState(false)
  const [ttl, setTtl] = useState('3600')
  const [encrypt, setEncrypt] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [machineFile, setMachineFile] = useState<MachineFile | null>(null)

  const ownerId = relationshipId(machine, 'owner')
  const groupId = relationshipId(machine, 'group')

  const loadRelationshipOptions = useCallback(async () => {
    try {
      setRelationshipsLoading(true)
      const [usersRes, groupsRes] = await Promise.all([
        api.users.list({ limit: 100 }),
        api.groups.list({ limit: 100 }),
      ])
      setOwners(usersRes.data || [])
      setGroups(groupsRes.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'machine relationships')
    } finally {
      setRelationshipsLoading(false)
    }
  }, [api.users, api.groups])

  const loadProcessesAndComponents = useCallback(async () => {
    try {
      setProcessesLoading(true)
      const [processesRes, componentsRes] = await Promise.all([
        api.machines.getProcesses(machine.id),
        api.machines.getComponents(machine.id),
      ])
      setProcesses(processesRes.data || [])
      setComponents(componentsRes.data || [])
      setProcessesLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'machine processes/components')
    } finally {
      setProcessesLoading(false)
    }
  }, [api.machines, machine.id])

  const handleKillProcess = (process: Process) => {
    setProcessToKill(process)
    setKillDialogOpen(true)
  }

  const confirmKillProcess = async () => {
    if (!processToKill) return
    try {
      setKilling(true)
      await api.processes.kill(processToKill.id)
      toast.success('Process killed')
      setKillDialogOpen(false)
      await loadProcessesAndComponents()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Process', {
        onNotFound: () => { setKillDialogOpen(false); loadProcessesAndComponents() },
      })
    } finally {
      setKilling(false)
    }
  }

  const getProcessStatusTone = (status: Process['attributes']['status']): StatusTone => {
    switch (status) {
      case 'ALIVE':
      case 'RESURRECTED':
        return 'success'
      case 'DEAD':
        return 'danger'
      default:
        return 'neutral'
    }
  }

  useEffect(() => {
    if (open) {
      form.reset(machineToFormValues(machine))
      loadRelationshipOptions()
      setProcessesLoaded(false)
      setMachineFile(null)
      setEditingRelationship(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, machine])

  const handleTabChange = (tab: string) => {
    if (tab === 'processes' && !processesLoaded) loadProcessesAndComponents()
  }

  const onSubmit = async (values: MachineFormValues) => {
    try {
      const original = machineToFormValues(machine)
      const updates: {
        name?: string
        platform?: string
        hostname?: string
        cores?: number
        requireHeartbeat?: boolean
        heartbeatDuration?: number
      } = {}

      if (values.name !== original.name) updates.name = values.name || undefined
      if (values.platform !== original.platform) updates.platform = values.platform || undefined
      if (values.hostname !== original.hostname) updates.hostname = values.hostname || undefined
      if (values.cores !== original.cores) updates.cores = values.cores ? parseInt(values.cores, 10) : undefined
      if (values.requireHeartbeat !== original.requireHeartbeat) updates.requireHeartbeat = values.requireHeartbeat
      if (values.heartbeatDuration !== original.heartbeatDuration) {
        updates.heartbeatDuration = values.heartbeatDuration ? parseInt(values.heartbeatDuration, 10) : undefined
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save')
        return
      }

      await api.machines.update(machine.id, updates)
      toast.success('Machine updated successfully')
      onMachineUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Machine')
    }
  }

  const startEditRelationship = (kind: 'owner' | 'group') => {
    setEditingRelationship(kind)
    setRelationshipValue(kind === 'owner' ? ownerId ?? '' : groupId ?? 'none')
  }

  const saveRelationship = async () => {
    if (!editingRelationship) return
    try {
      setSavingRelationship(true)
      if (editingRelationship === 'owner') {
        if (!relationshipValue) return
        await api.machines.changeOwner(machine.id, relationshipValue)
      } else {
        await api.machines.changeGroup(machine.id, relationshipValue === 'none' ? null : relationshipValue)
      }
      toast.success('Machine updated successfully')
      setEditingRelationship(null)
      onMachineUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Machine')
    } finally {
      setSavingRelationship(false)
    }
  }

  const handlePing = async () => {
    try {
      setPinging(true)
      await api.machines.ping(machine.id)
      toast.success('Heartbeat ping sent')
      onMachineUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Machine', { customMessage: 'Failed to ping machine' })
    } finally {
      setPinging(false)
    }
  }

  const handleResetHeartbeat = async () => {
    try {
      setResettingHeartbeat(true)
      await api.machines.resetHeartbeat(machine.id)
      toast.success('Heartbeat reset')
      onMachineUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Machine', { customMessage: 'Failed to reset heartbeat' })
    } finally {
      setResettingHeartbeat(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true)
      const parsedTtl = ttl.trim() ? parseInt(ttl, 10) : undefined
      const response = await api.machines.checkOut(machine.id, { ttl: parsedTtl, encrypt })
      if (response.data) {
        setMachineFile(response.data)
        toast.success('Machine checked out')
      }
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'Machine file', { customMessage: 'Failed to check out machine' })
    } finally {
      setCheckingOut(false)
    }
  }

  const copyCertificate = () => {
    if (!machineFile) return
    navigator.clipboard.writeText(machineFile.attributes.certificate)
    toast.success('Certificate copied to clipboard')
  }

  const ownerEmail = owners.find((u) => u.id === ownerId)?.attributes.email
  const groupName = groups.find((g) => g.id === groupId)?.attributes.name

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {machine.attributes.name || machine.attributes.fingerprint}
          </DialogTitle>
          <DialogDescription>
            Edit machine details, monitor heartbeat, and check out an offline machine file.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="processes">Processes &amp; Components</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Unnamed machine" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., darwin" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hostname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hostname</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cores"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cores</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="heartbeatDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Heartbeat Duration (seconds)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="requireHeartbeat"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0 self-end pb-1.5">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <Label className="font-normal">Require heartbeat</Label>
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Relationships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relationshipsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-muted-foreground">Owner</Label>
                        {editingRelationship === 'owner' ? (
                          <Select value={relationshipValue} onValueChange={setRelationshipValue}>
                            <SelectTrigger className="w-[240px] mt-1">
                              <SelectValue placeholder="Select an owner" />
                            </SelectTrigger>
                            <SelectContent>
                              {owners.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.attributes.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm mt-1">{ownerEmail || 'None'}</p>
                        )}
                      </div>
                      {editingRelationship === 'owner' ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={saveRelationship} disabled={savingRelationship}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingRelationship(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEditRelationship('owner')}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-muted-foreground">Group</Label>
                        {editingRelationship === 'group' ? (
                          <Select value={relationshipValue} onValueChange={setRelationshipValue}>
                            <SelectTrigger className="w-[240px] mt-1">
                              <SelectValue placeholder="Select a group" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {groups.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.attributes.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm mt-1">{groupName || 'None'}</p>
                        )}
                      </div>
                      {editingRelationship === 'group' ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={saveRelationship} disabled={savingRelationship}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingRelationship(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEditRelationship('group')}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processes & Components */}
          <TabsContent value="processes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Processes ({processes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {processesLoading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : processes.length > 0 ? (
                  <div className="space-y-2">
                    {processes.map((process) => (
                      <div key={process.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">PID {process.attributes.pid}</span>
                          <StatusBadge tone={getProcessStatusTone(process.attributes.status)}>
                            {process.attributes.status.toLowerCase()}
                          </StatusBadge>
                          {process.attributes.lastHeartbeat && (
                            <span className="text-xs text-muted-foreground">
                              last heartbeat {formatDateTime(process.attributes.lastHeartbeat)}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleKillProcess(process)}
                          title="Kill process"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No processes reported</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Components ({components.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {processesLoading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : components.length > 0 ? (
                  <div className="space-y-2">
                    {components.map((component) => (
                      <div key={component.id} className="flex items-center justify-between p-2 border rounded text-sm">
                        <span>{component.attributes.name}</span>
                        <code className="text-xs text-muted-foreground font-mono">
                          {component.attributes.fingerprint.substring(0, 16)}...
                        </code>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No components reported</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions */}
          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Heartbeat</CardTitle>
                <CardDescription>
                  Current status: <Badge variant="outline">{machine.attributes.heartbeatStatus}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handlePing} disabled={pinging}>
                  <Activity className="mr-2 h-3.5 w-3.5" />
                  {pinging ? 'Pinging...' : 'Ping'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleResetHeartbeat} disabled={resettingHeartbeat}>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  {resettingHeartbeat ? 'Resetting...' : 'Reset Heartbeat'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Check Out Machine File</CardTitle>
                <CardDescription>
                  A signed snapshot the client verifies offline, valid for the given TTL without contacting the server.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="machine-ttl">TTL (seconds)</Label>
                    <Input id="machine-ttl" type="number" value={ttl} onChange={(e) => setTtl(e.target.value)} />
                  </div>
                  <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={encrypt} onCheckedChange={(v) => setEncrypt(!!v)} />
                      Encrypt
                    </label>
                  </div>
                </div>
                <Button size="sm" onClick={handleCheckOut} disabled={checkingOut}>
                  <Download className="mr-2 h-3.5 w-3.5" />
                  {checkingOut ? 'Checking out...' : 'Check Out'}
                </Button>
                {machineFile && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground">Certificate</Label>
                      <Button size="sm" variant="ghost" onClick={copyCertificate}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea readOnly rows={6} className="font-mono text-xs" value={machineFile.attributes.certificate} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={killDialogOpen}
      onOpenChange={setKillDialogOpen}
      title="Kill this process?"
      description={
        <>
          This will terminate process{' '}
          <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
            PID {processToKill?.attributes.pid}
          </code>{' '}
          on this machine. If it&apos;s monitored by a policy that requires heartbeats, the
          license may be affected once its heartbeat lapses.
        </>
      }
      confirmLabel="Kill Process"
      destructive
      loading={killing}
      onConfirm={confirmKillProcess}
    />
    </>
  )
}
