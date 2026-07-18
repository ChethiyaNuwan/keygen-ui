'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { User, License, Machine } from '@/lib/types/keygen'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Key, Monitor, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'

interface UserDetailsDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  const api = getKeygenApi()

  const [licenses, setLicenses] = useState<License[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [licensesLoaded, setLicensesLoaded] = useState(false)
  const [machinesLoaded, setMachinesLoaded] = useState(false)
  const [licensesLoading, setLicensesLoading] = useState(false)
  const [machinesLoading, setMachinesLoading] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const loadLicenses = useCallback(async () => {
    try {
      setLicensesLoading(true)
      const response = await api.users.getLicenses(user.id)
      setLicenses(response.data || [])
      setLicensesLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'user licenses')
    } finally {
      setLicensesLoading(false)
    }
  }, [api.users, user.id])

  const loadMachines = useCallback(async () => {
    try {
      setMachinesLoading(true)
      const response = await api.users.getMachines(user.id)
      setMachines(response.data || [])
      setMachinesLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'user machines')
    } finally {
      setMachinesLoading(false)
    }
  }, [api.users, user.id])

  useEffect(() => {
    if (open) {
      setLicensesLoaded(false)
      setMachinesLoaded(false)
    }
  }, [open, user.id])

  const handleTabChange = (tab: string) => {
    if (tab === 'licenses' && !licensesLoaded) loadLicenses()
    if (tab === 'machines' && !machinesLoaded) loadMachines()
  }

  const handleSendPasswordReset = async () => {
    try {
      setSendingReset(true)
      await api.passwords.resetRequest(user.attributes.email)
      toast.success(`Password reset email sent to ${user.attributes.email}`)
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'Password reset', { customMessage: 'Failed to send password reset email' })
    } finally {
      setSendingReset(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {user.attributes.email}
          </DialogTitle>
          <DialogDescription>
            Licenses and machines associated with this user.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="licenses" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="licenses">Licenses</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Licenses */}
          <TabsContent value="licenses">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Licenses ({licenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {licensesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
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
                        <Badge variant={license.attributes.status === 'active' ? 'default' : 'secondary'}>
                          {license.attributes.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No licenses owned by this user</p>
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
                  <div className="space-y-2">
                    {machines.map((machine) => (
                      <div key={machine.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{machine.attributes.name || machine.attributes.fingerprint}</p>
                          <p className="text-xs text-muted-foreground">{machine.attributes.platform || 'Unknown platform'}</p>
                        </div>
                        <Badge variant={machine.attributes.heartbeatStatus === 'alive' ? 'default' : 'secondary'}>
                          {machine.attributes.heartbeatStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No machines owned by this user</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions */}
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Password Reset</CardTitle>
              </CardHeader>
              <CardContent>
                <Button size="sm" variant="outline" onClick={handleSendPasswordReset} disabled={sendingReset}>
                  <Mail className="mr-2 h-3.5 w-3.5" />
                  {sendingReset ? 'Sending...' : 'Send Password Reset Email'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
