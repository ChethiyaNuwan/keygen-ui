'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { License, Machine, Entitlement, User, Policy, Group, LicenseFile } from '@/lib/types/keygen'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  Key,
  Copy,
  Monitor,
  BadgeCheck,
  Users,
  Trash2,
  Download,
  LogIn,
  RotateCcw,
  Ban,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDateTime } from '@/lib/utils/format'

interface LicenseDetailsDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
  onLicenseUpdated: () => void
}

function relationshipId(license: License, key: string): string | undefined {
  const rel = license.relationships?.[key]?.data
  return rel && !Array.isArray(rel) ? rel.id : undefined
}

export function LicenseDetailsDialog({ license, open, onOpenChange, onLicenseUpdated }: LicenseDetailsDialogProps) {
  const api = getKeygenApi()

  // Overview / relationships
  const [policies, setPolicies] = useState<Policy[]>([])
  const [owners, setOwners] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [relationshipsLoading, setRelationshipsLoading] = useState(false)
  const [editingRelationship, setEditingRelationship] = useState<'policy' | 'owner' | 'group' | null>(null)
  const [relationshipValue, setRelationshipValue] = useState('')
  const [savingRelationship, setSavingRelationship] = useState(false)

  // Machines tab
  const [machines, setMachines] = useState<Machine[]>([])
  const [machinesLoaded, setMachinesLoaded] = useState(false)
  const [machinesLoading, setMachinesLoading] = useState(false)

  // Entitlements tab
  const [attachedEntitlements, setAttachedEntitlements] = useState<Entitlement[]>([])
  const [allEntitlements, setAllEntitlements] = useState<Entitlement[]>([])
  const [entitlementsLoaded, setEntitlementsLoaded] = useState(false)
  const [entitlementsLoading, setEntitlementsLoading] = useState(false)
  const [entitlementSearch, setEntitlementSearch] = useState('')
  const [selectedEntitlements, setSelectedEntitlements] = useState<string[]>([])
  const [attachingEntitlements, setAttachingEntitlements] = useState(false)

  // Users tab
  const [attachedUsers, setAttachedUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [attachingUsers, setAttachingUsers] = useState(false)

  // Actions tab
  const [ttl, setTtl] = useState('3600')
  const [encrypt, setEncrypt] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [licenseFile, setLicenseFile] = useState<LicenseFile | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [resettingUsage, setResettingUsage] = useState(false)
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const policyId = relationshipId(license, 'policy')
  const ownerId = relationshipId(license, 'owner')
  const groupId = relationshipId(license, 'group')

  const loadRelationshipOptions = useCallback(async () => {
    try {
      setRelationshipsLoading(true)
      const [policiesRes, usersRes, groupsRes] = await Promise.all([
        api.policies.list({ limit: 100 }),
        api.users.list({ limit: 100 }),
        api.groups.list({ limit: 100 }),
      ])
      setPolicies(policiesRes.data || [])
      setOwners(usersRes.data || [])
      setGroups(groupsRes.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'license relationships')
    } finally {
      setRelationshipsLoading(false)
    }
  }, [api.policies, api.users, api.groups])

  const loadMachines = useCallback(async () => {
    try {
      setMachinesLoading(true)
      const response = await api.licenses.getMachines(license.id)
      setMachines(response.data || [])
      setMachinesLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'license machines')
    } finally {
      setMachinesLoading(false)
    }
  }, [api.licenses, license.id])

  const loadEntitlements = useCallback(async () => {
    try {
      setEntitlementsLoading(true)
      const [attachedRes, allRes] = await Promise.all([
        api.licenses.getEntitlements(license.id),
        api.entitlements.list({ limit: 100 }),
      ])
      setAttachedEntitlements(attachedRes.data || [])
      setAllEntitlements(allRes.data || [])
      setEntitlementsLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'license entitlements')
    } finally {
      setEntitlementsLoading(false)
    }
  }, [api.licenses, api.entitlements, license.id])

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true)
      const [attachedRes, allRes] = await Promise.all([
        api.licenses.getUsers(license.id),
        api.users.list({ limit: 100 }),
      ])
      setAttachedUsers(attachedRes.data || [])
      setAllUsers(allRes.data || [])
      setUsersLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'license users')
    } finally {
      setUsersLoading(false)
    }
  }, [api.licenses, api.users, license.id])

  useEffect(() => {
    if (open) {
      loadRelationshipOptions()
      setMachinesLoaded(false)
      setEntitlementsLoaded(false)
      setUsersLoaded(false)
      setLicenseFile(null)
      setEditingRelationship(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, license.id])

  const handleTabChange = (tab: string) => {
    if (tab === 'machines' && !machinesLoaded) loadMachines()
    if (tab === 'entitlements' && !entitlementsLoaded) loadEntitlements()
    if (tab === 'users' && !usersLoaded) loadUsers()
  }

  const copyKey = () => {
    navigator.clipboard.writeText(license.attributes.key)
    toast.success('License key copied to clipboard')
  }

  const startEditRelationship = (kind: 'policy' | 'owner' | 'group') => {
    setEditingRelationship(kind)
    setRelationshipValue(
      kind === 'policy' ? policyId ?? '' : kind === 'owner' ? ownerId ?? '' : groupId ?? 'none'
    )
  }

  const saveRelationship = async () => {
    if (!editingRelationship) return
    try {
      setSavingRelationship(true)
      if (editingRelationship === 'policy') {
        if (!relationshipValue) return
        await api.licenses.changePolicy(license.id, relationshipValue)
      } else if (editingRelationship === 'owner') {
        if (!relationshipValue) return
        await api.licenses.changeOwner(license.id, relationshipValue)
      } else {
        await api.licenses.changeGroup(license.id, relationshipValue === 'none' ? null : relationshipValue)
      }
      toast.success('License updated successfully')
      setEditingRelationship(null)
      onLicenseUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License')
    } finally {
      setSavingRelationship(false)
    }
  }

  const handleDeactivateMachine = async (machine: Machine) => {
    try {
      await api.machines.deactivate(machine.id)
      toast.success('Machine deactivated')
      setMachines((prev) => prev.filter((m) => m.id !== machine.id))
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Machine')
    }
  }

  const handleDetachEntitlement = async (entitlement: Entitlement) => {
    try {
      await api.licenses.detachEntitlements(license.id, [entitlement.id])
      toast.success('Entitlement detached')
      setAttachedEntitlements((prev) => prev.filter((e) => e.id !== entitlement.id))
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Entitlement')
    }
  }

  const handleAttachEntitlements = async () => {
    if (selectedEntitlements.length === 0) return
    try {
      setAttachingEntitlements(true)
      await api.licenses.attachEntitlements(license.id, selectedEntitlements)
      toast.success('Entitlements attached')
      setSelectedEntitlements([])
      await loadEntitlements()
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'Entitlement')
    } finally {
      setAttachingEntitlements(false)
    }
  }

  const handleDetachUser = async (user: User) => {
    try {
      await api.licenses.detachUsers(license.id, [user.id])
      toast.success('User detached')
      setAttachedUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'User')
    }
  }

  const handleAttachUsers = async () => {
    if (selectedUsers.length === 0) return
    try {
      setAttachingUsers(true)
      await api.licenses.attachUsers(license.id, selectedUsers)
      toast.success('Users attached')
      setSelectedUsers([])
      await loadUsers()
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'User')
    } finally {
      setAttachingUsers(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true)
      const parsedTtl = ttl.trim() ? parseInt(ttl, 10) : undefined
      const response = await api.licenses.checkOut(license.id, { ttl: parsedTtl, encrypt })
      if (response.data) {
        setLicenseFile(response.data)
        toast.success('License checked out')
      }
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'License file', { customMessage: 'Failed to check out license' })
    } finally {
      setCheckingOut(false)
    }
  }

  const copyCertificate = () => {
    if (!licenseFile) return
    navigator.clipboard.writeText(licenseFile.attributes.certificate)
    toast.success('Certificate copied to clipboard')
  }

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true)
      await api.licenses.checkIn(license.id)
      toast.success('License checked in')
      onLicenseUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License', { customMessage: 'Failed to check in license' })
    } finally {
      setCheckingIn(false)
    }
  }

  const handleResetUsage = async () => {
    try {
      setResettingUsage(true)
      await api.licenses.resetUsage(license.id)
      toast.success('Usage reset')
      onLicenseUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License', { customMessage: 'Failed to reset usage' })
    } finally {
      setResettingUsage(false)
    }
  }

  const handleRevoke = async () => {
    try {
      setRevoking(true)
      await api.licenses.revoke(license.id)
      toast.success('License revoked')
      setRevokeConfirmOpen(false)
      onLicenseUpdated()
      onOpenChange(false)
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'License', { customMessage: 'Failed to revoke license' })
    } finally {
      setRevoking(false)
    }
  }

  const policyName = policies.find((p) => p.id === policyId)?.attributes.name
  const ownerEmail = owners.find((u) => u.id === ownerId)?.attributes.email
  const groupName = groups.find((g) => g.id === groupId)?.attributes.name

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {license.attributes.name || 'License Details'}
            </DialogTitle>
            <DialogDescription>
              Inspect and manage this license&apos;s machines, entitlements, users, and lifecycle.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="overview" onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="machines">Machines</TabsTrigger>
              <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">License Key</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-muted px-2 py-1.5 rounded font-mono break-all">
                      {license.attributes.key}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyKey}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="text-sm mt-1">
                      <Badge variant="outline">{license.attributes.status.toLowerCase()}</Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Usage</Label>
                    <p className="text-sm mt-1 tabular-nums">
                      {license.attributes.uses || 0}
                      {license.attributes.maxUses ? ` / ${license.attributes.maxUses}` : ' (unlimited)'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Expiry</Label>
                    <p className="text-sm mt-1">
                      {license.attributes.expiry ? formatDateTime(license.attributes.expiry) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="text-sm mt-1">{formatDateTime(license.attributes.created)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Relationships</CardTitle>
                  <CardDescription>Which policy, owner, and group this license belongs to</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relationshipsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
                    <>
                      {/* Policy */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-muted-foreground">Policy</Label>
                          {editingRelationship === 'policy' ? (
                            <Select value={relationshipValue} onValueChange={setRelationshipValue}>
                              <SelectTrigger className="w-[240px] mt-1">
                                <SelectValue placeholder="Select a policy" />
                              </SelectTrigger>
                              <SelectContent>
                                {policies.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.attributes.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm mt-1">{policyName || 'Unknown'}</p>
                          )}
                        </div>
                        {editingRelationship === 'policy' ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={saveRelationship} disabled={savingRelationship}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingRelationship(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => startEditRelationship('policy')}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Owner */}
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

                      {/* Group */}
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

            {/* Machines */}
            <TabsContent value="machines">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Machines ({machines.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {machinesLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : machines.length > 0 ? (
                    <ScrollArea className="h-64">
                      <div className="space-y-2 pr-3">
                        {machines.map((machine) => (
                          <div key={machine.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="text-sm font-medium">{machine.attributes.name || machine.attributes.fingerprint}</p>
                              <p className="text-xs text-muted-foreground">
                                {machine.attributes.platform || 'Unknown platform'}
                                {machine.attributes.hostname ? ` · ${machine.attributes.hostname}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={machine.attributes.heartbeatStatus === 'alive' ? 'default' : 'secondary'}>
                                {machine.attributes.heartbeatStatus}
                              </Badge>
                              <Button size="sm" variant="ghost" onClick={() => handleDeactivateMachine(machine)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No machines activated on this license</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Entitlements */}
            <TabsContent value="entitlements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    Attached Entitlements ({attachedEntitlements.length})
                  </CardTitle>
                  <CardDescription>
                    Licenses also inherit entitlements from their policy — these are attached directly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {entitlementsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : attachedEntitlements.length > 0 ? (
                    <div className="space-y-2">
                      {attachedEntitlements.map((ent) => (
                        <div key={ent.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">
                            {ent.attributes.name}
                            <span className="text-muted-foreground"> · {ent.attributes.code}</span>
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => handleDetachEntitlement(ent)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No entitlements attached directly</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attach Entitlements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search entitlements…"
                        value={entitlementSearch}
                        onChange={(e) => setEntitlementSearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-40">
                      <div className="p-2 space-y-2">
                        {allEntitlements
                          .filter((ent) => !attachedEntitlements.some((a) => a.id === ent.id))
                          .filter((ent) => {
                            const q = entitlementSearch.toLowerCase()
                            return (
                              !q ||
                              ent.attributes.name.toLowerCase().includes(q) ||
                              ent.attributes.code.toLowerCase().includes(q)
                            )
                          })
                          .map((ent) => (
                            <label key={ent.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selectedEntitlements.includes(ent.id)}
                                onCheckedChange={(checked) =>
                                  setSelectedEntitlements((prev) =>
                                    checked ? [...prev, ent.id] : prev.filter((id) => id !== ent.id)
                                  )
                                }
                              />
                              <span>
                                {ent.attributes.name}
                                <span className="text-muted-foreground"> · {ent.attributes.code}</span>
                              </span>
                            </label>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAttachEntitlements}
                    disabled={selectedEntitlements.length === 0 || attachingEntitlements}
                  >
                    {attachingEntitlements ? 'Attaching…' : `Attach ${selectedEntitlements.length || ''}`.trim()}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Attached Users ({attachedUsers.length})
                  </CardTitle>
                  <CardDescription>
                    Users who can use this license, separate from its owner.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : attachedUsers.length > 0 ? (
                    <div className="space-y-2">
                      {attachedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{user.attributes.email}</span>
                          <Button size="sm" variant="ghost" onClick={() => handleDetachUser(user)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No users attached</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attach Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search users…"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-40">
                      <div className="p-2 space-y-2">
                        {allUsers
                          .filter((u) => !attachedUsers.some((a) => a.id === u.id))
                          .filter((u) => {
                            const q = userSearch.toLowerCase()
                            return !q || u.attributes.email.toLowerCase().includes(q)
                          })
                          .map((u) => (
                            <label key={u.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selectedUsers.includes(u.id)}
                                onCheckedChange={(checked) =>
                                  setSelectedUsers((prev) =>
                                    checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                                  )
                                }
                              />
                              <span>{u.attributes.email}</span>
                            </label>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <Button size="sm" onClick={handleAttachUsers} disabled={selectedUsers.length === 0 || attachingUsers}>
                    {attachingUsers ? 'Attaching…' : `Attach ${selectedUsers.length || ''}`.trim()}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Actions */}
            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Check Out License File</CardTitle>
                  <CardDescription>
                    A signed snapshot the client verifies offline, valid for the given TTL without contacting the server.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="ttl">TTL (seconds)</Label>
                      <Input id="ttl" type="number" value={ttl} onChange={(e) => setTtl(e.target.value)} />
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
                    {checkingOut ? 'Checking out…' : 'Check Out'}
                  </Button>
                  {licenseFile && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Certificate</Label>
                        <Button size="sm" variant="ghost" onClick={copyCertificate}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Textarea readOnly rows={6} className="font-mono text-xs" value={licenseFile.attributes.certificate} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Usage & Check-In</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={handleCheckIn} disabled={checkingIn}>
                    <LogIn className="mr-2 h-3.5 w-3.5" />
                    {checkingIn ? 'Checking in…' : 'Check In'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleResetUsage} disabled={resettingUsage}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    {resettingUsage ? 'Resetting…' : 'Reset Usage'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Revoke License</CardTitle>
                  <CardDescription>
                    Permanently disables this license. Unlike Suspend, this cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="destructive" onClick={() => setRevokeConfirmOpen(true)}>
                    <Ban className="mr-2 h-3.5 w-3.5" />
                    Revoke License
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeConfirmOpen}
        onOpenChange={setRevokeConfirmOpen}
        title="Revoke this license?"
        description="This permanently disables the license. Unlike suspending it, revoking cannot be undone — the license and its activation history are gone for good."
        confirmLabel="Revoke"
        destructive
        loading={revoking}
        onConfirm={handleRevoke}
      />
    </>
  )
}
