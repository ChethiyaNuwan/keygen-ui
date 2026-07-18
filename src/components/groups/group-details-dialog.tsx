'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Group, License, User } from '@/lib/types/keygen'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, KeyRound, Calendar, Info, ShieldCheck, Trash2 } from 'lucide-react'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDateTime } from '@/lib/utils/format'
import { toast } from 'sonner'

interface GroupDetailsDialogProps {
  group: Group
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GroupDetailsDialog({ group, open, onOpenChange }: GroupDetailsDialogProps) {
  const api = getKeygenApi()

  // Licenses tab
  const [licenses, setLicenses] = useState<License[]>([])
  const [allLicenses, setAllLicenses] = useState<License[]>([])
  const [licensesLoaded, setLicensesLoaded] = useState(false)
  const [licensesLoading, setLicensesLoading] = useState(false)
  const [licenseSearch, setLicenseSearch] = useState('')
  const [addingLicense, setAddingLicense] = useState<string | null>(null)

  // Users tab
  const [users, setUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [addingUser, setAddingUser] = useState<string | null>(null)

  // Owners tab
  const [owners, setOwners] = useState<User[]>([])
  const [ownersLoaded, setOwnersLoaded] = useState(false)
  const [ownersLoading, setOwnersLoading] = useState(false)
  const [ownerSearch, setOwnerSearch] = useState('')
  const [addingOwner, setAddingOwner] = useState<string | null>(null)

  const loadLicenses = useCallback(async () => {
    try {
      setLicensesLoading(true)
      const [groupLicensesRes, allLicensesRes] = await Promise.all([
        api.groups.getLicenses(group.id, { limit: 50 }),
        api.licenses.list({ limit: 100 }),
      ])
      setLicenses(groupLicensesRes.data || [])
      setAllLicenses(allLicensesRes.data || [])
      setLicensesLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'group licenses')
    } finally {
      setLicensesLoading(false)
    }
  }, [api.groups, api.licenses, group.id])

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true)
      const [groupUsersRes, allUsersRes] = await Promise.all([
        api.groups.getUsers(group.id, { limit: 50 }),
        api.users.list({ limit: 100 }),
      ])
      setUsers(groupUsersRes.data || [])
      setAllUsers(allUsersRes.data || [])
      setUsersLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'group users')
    } finally {
      setUsersLoading(false)
    }
  }, [api.groups, api.users, group.id])

  const loadOwners = useCallback(async () => {
    try {
      setOwnersLoading(true)
      const [ownersRes, allUsersRes] = await Promise.all([
        api.groups.listOwners(group.id),
        allUsers.length > 0 ? Promise.resolve({ data: allUsers }) : api.users.list({ limit: 100 }),
      ])
      setOwners(ownersRes.data || [])
      if (allUsers.length === 0) setAllUsers(allUsersRes.data || [])
      setOwnersLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'group owners')
    } finally {
      setOwnersLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.groups, api.users, group.id])

  useEffect(() => {
    if (open && group.id) {
      setLicensesLoaded(false)
      setUsersLoaded(false)
      setOwnersLoaded(false)
    }
  }, [open, group.id])

  const handleTabChange = (tab: string) => {
    if (tab === 'licenses' && !licensesLoaded) loadLicenses()
    if (tab === 'users' && !usersLoaded) loadUsers()
    if (tab === 'owners' && !ownersLoaded) loadOwners()
  }

  const handleAddLicense = async (license: License) => {
    try {
      setAddingLicense(license.id)
      await api.groups.addLicense(group.id, license.id)
      toast.success('License added to group')
      setLicenses((prev) => [...prev, license])
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License')
    } finally {
      setAddingLicense(null)
    }
  }

  const handleRemoveLicense = async (license: License) => {
    try {
      await api.groups.removeLicense(group.id, license.id)
      toast.success('License removed from group')
      setLicenses((prev) => prev.filter((l) => l.id !== license.id))
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License')
    }
  }

  const handleAddUser = async (user: User) => {
    try {
      setAddingUser(user.id)
      await api.groups.addUser(group.id, user.id)
      toast.success('User added to group')
      setUsers((prev) => [...prev, user])
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'User')
    } finally {
      setAddingUser(null)
    }
  }

  const handleRemoveUser = async (user: User) => {
    try {
      await api.groups.removeUser(group.id, user.id)
      toast.success('User removed from group')
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'User')
    }
  }

  const handleAddOwner = async (user: User) => {
    try {
      setAddingOwner(user.id)
      await api.groups.attachOwners(group.id, [user.id])
      toast.success('Owner added')
      setOwners((prev) => [...prev, user])
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Owner')
    } finally {
      setAddingOwner(null)
    }
  }

  const handleRemoveOwner = async (user: User) => {
    try {
      await api.groups.detachOwners(group.id, [user.id])
      toast.success('Owner removed')
      setOwners((prev) => prev.filter((u) => u.id !== user.id))
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Owner')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {group.attributes.name}
          </DialogTitle>
          <DialogDescription>
            Group details, members, licenses, and owners.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="licenses">Licenses</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="owners">Owners</TabsTrigger>
          </TabsList>

          {/* Info */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-4 w-4" />
                  Group Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm">{group.attributes.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ID</label>
                    <p className="text-sm font-mono">{group.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Max Licenses</label>
                    <p className="text-sm">
                      {group.attributes.maxLicenses ? (
                        <Badge variant="secondary">{group.attributes.maxLicenses}</Badge>
                      ) : (
                        <Badge variant="outline">Unlimited</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Max Machines</label>
                    <p className="text-sm">
                      {group.attributes.maxMachines ? (
                        <Badge variant="secondary">{group.attributes.maxMachines}</Badge>
                      ) : (
                        <Badge variant="outline">Unlimited</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Max Users</label>
                    <p className="text-sm">
                      {group.attributes.maxUsers ? (
                        <Badge variant="secondary">{group.attributes.maxUsers}</Badge>
                      ) : (
                        <Badge variant="outline">Unlimited</Badge>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDateTime(group.attributes.created)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Updated</label>
                    <p className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDateTime(group.attributes.updated)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Licenses */}
          <TabsContent value="licenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Licenses ({licenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {licensesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : licenses.length > 0 ? (
                  <div className="space-y-2">
                    {licenses.map((license) => (
                      <div key={license.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{license.attributes.name || 'Unnamed License'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{license.attributes.key}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={license.attributes.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {license.attributes.status.toLowerCase()}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveLicense(license)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No licenses in this group</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add License</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search licenses…"
                  value={licenseSearch}
                  onChange={(e) => setLicenseSearch(e.target.value)}
                />
                <ScrollArea className="h-40">
                  <div className="space-y-2 pr-3">
                    {allLicenses
                      .filter((l) => !licenses.some((a) => a.id === l.id))
                      .filter((l) => {
                        const q = licenseSearch.toLowerCase()
                        return (
                          !q ||
                          (l.attributes.name || '').toLowerCase().includes(q) ||
                          l.attributes.key.toLowerCase().includes(q)
                        )
                      })
                      .map((l) => (
                        <div key={l.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <span className="truncate">{l.attributes.name || l.attributes.key}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={addingLicense === l.id}
                            onClick={() => handleAddLicense(l)}
                          >
                            {addingLicense === l.id ? 'Adding…' : 'Add'}
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : users.length > 0 ? (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">
                            {user.attributes.fullName || user.attributes.email}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.attributes.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{user.attributes.role}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveUser(user)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No users in this group</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add User</CardTitle>
                <CardDescription>
                  Adding a user here moves them into this group — a user belongs to at most one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search users…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <ScrollArea className="h-40">
                  <div className="space-y-2 pr-3">
                    {allUsers
                      .filter((u) => !users.some((a) => a.id === u.id))
                      .filter((u) => {
                        const q = userSearch.toLowerCase()
                        return !q || u.attributes.email.toLowerCase().includes(q)
                      })
                      .map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <span className="truncate">{u.attributes.email}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={addingUser === u.id}
                            onClick={() => handleAddUser(u)}
                          >
                            {addingUser === u.id ? 'Adding…' : 'Add'}
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Owners */}
          <TabsContent value="owners" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Owners ({owners.length})
                </CardTitle>
                <CardDescription>Users who can administer this group.</CardDescription>
              </CardHeader>
              <CardContent>
                {ownersLoading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : owners.length > 0 ? (
                  <div className="space-y-2">
                    {owners.map((owner) => (
                      <div key={owner.id} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{owner.attributes.email}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveOwner(owner)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No owners assigned</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Owner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search users…"
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                />
                <ScrollArea className="h-40">
                  <div className="space-y-2 pr-3">
                    {allUsers
                      .filter((u) => !owners.some((o) => o.id === u.id))
                      .filter((u) => {
                        const q = ownerSearch.toLowerCase()
                        return !q || u.attributes.email.toLowerCase().includes(q)
                      })
                      .map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <span className="truncate">{u.attributes.email}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={addingOwner === u.id}
                            onClick={() => handleAddOwner(u)}
                          >
                            {addingOwner === u.id ? 'Adding…' : 'Add'}
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
