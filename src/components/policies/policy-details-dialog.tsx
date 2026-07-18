'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Policy, Entitlement, PooledKey } from '@/lib/types/keygen'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { BadgeCheck, Trash2, Boxes, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'

interface PolicyDetailsDialogProps {
  policy: Policy
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PolicyDetailsDialog({ policy, open, onOpenChange }: PolicyDetailsDialogProps) {
  const api = getKeygenApi()

  // Entitlements tab
  const [attachedEntitlements, setAttachedEntitlements] = useState<Entitlement[]>([])
  const [allEntitlements, setAllEntitlements] = useState<Entitlement[]>([])
  const [entitlementsLoaded, setEntitlementsLoaded] = useState(false)
  const [entitlementsLoading, setEntitlementsLoading] = useState(false)
  const [entitlementSearch, setEntitlementSearch] = useState('')
  const [selectedEntitlements, setSelectedEntitlements] = useState<string[]>([])
  const [attachingEntitlements, setAttachingEntitlements] = useState(false)

  // Pool tab
  const usePool = policy.attributes.usePool
  const [pool, setPool] = useState<PooledKey[]>([])
  const [poolLoaded, setPoolLoaded] = useState(false)
  const [poolLoading, setPoolLoading] = useState(false)

  const loadEntitlements = useCallback(async () => {
    try {
      setEntitlementsLoading(true)
      const [attachedRes, allRes] = await Promise.all([
        api.policies.getEntitlements(policy.id),
        api.entitlements.list({ limit: 100 }),
      ])
      setAttachedEntitlements(attachedRes.data || [])
      setAllEntitlements(allRes.data || [])
      setEntitlementsLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'policy entitlements')
    } finally {
      setEntitlementsLoading(false)
    }
  }, [api.policies, api.entitlements, policy.id])

  const loadPool = useCallback(async () => {
    try {
      setPoolLoading(true)
      const response = await api.policies.listPool(policy.id)
      setPool(response.data || [])
      setPoolLoaded(true)
    } catch (error: unknown) {
      handleLoadError(error, 'policy pool')
    } finally {
      setPoolLoading(false)
    }
  }, [api.policies, policy.id])

  useEffect(() => {
    if (open) {
      setEntitlementsLoaded(false)
      setPoolLoaded(false)
    }
  }, [open, policy.id])

  const handleTabChange = (tab: string) => {
    if (tab === 'entitlements' && !entitlementsLoaded) loadEntitlements()
    if (tab === 'pool' && !poolLoaded) loadPool()
  }

  const handleDetachEntitlement = async (entitlement: Entitlement) => {
    try {
      await api.policies.detachEntitlements(policy.id, [entitlement.id])
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
      await api.policies.attachEntitlements(policy.id, selectedEntitlements)
      toast.success('Entitlements attached')
      setSelectedEntitlements([])
      await loadEntitlements()
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'Entitlement')
    } finally {
      setAttachingEntitlements(false)
    }
  }

  const handlePopKey = async () => {
    try {
      const response = await api.policies.popFromPool(policy.id)
      if (response.data) {
        navigator.clipboard.writeText(response.data.attributes.key)
        toast.success('Key popped from pool and copied to clipboard')
        setPool((prev) => prev.filter((k) => k.id !== response.data!.id))
      }
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Pooled key', { customMessage: 'Failed to pop key from pool' })
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Key copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5" />
            {policy.attributes.name}
          </DialogTitle>
          <DialogDescription>
            Entitlements attached to this policy{usePool ? ' and its licence key pool' : ''}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="entitlements" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
            {usePool && <TabsTrigger value="pool">Pool</TabsTrigger>}
          </TabsList>

          {/* Entitlements */}
          <TabsContent value="entitlements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" />
                  Attached ({attachedEntitlements.length})
                </CardTitle>
                <CardDescription>
                  Every license created under this policy inherits these entitlements automatically.
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
                  <p className="text-sm text-muted-foreground text-center py-4">No entitlements attached</p>
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

          {/* Pool */}
          {usePool && (
            <TabsContent value="pool">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Boxes className="h-4 w-4" />
                    Pooled Keys ({pool.length})
                  </CardTitle>
                  <CardDescription>
                    Pre-generated license keys this policy draws from when a new license is created.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {poolLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : pool.length > 0 ? (
                    <ScrollArea className="h-56">
                      <div className="space-y-2 pr-3">
                        {pool.map((pooledKey) => (
                          <div key={pooledKey.id} className="flex items-center justify-between p-2 border rounded">
                            <code className="text-xs font-mono truncate">{pooledKey.attributes.key}</code>
                            <Button size="sm" variant="ghost" onClick={() => copyKey(pooledKey.attributes.key)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Pool is empty</p>
                  )}
                  <Button size="sm" variant="outline" onClick={handlePopKey} disabled={pool.length === 0}>
                    Pop Next Key
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
