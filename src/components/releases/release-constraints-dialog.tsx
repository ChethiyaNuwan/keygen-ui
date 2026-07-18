'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, X } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { Release, Entitlement, Constraint } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'

interface ReleaseConstraintsDialogProps {
  release: Release | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * A release with entitlement constraints attached can only be downloaded by
 * a license entitled to every one of them (strict match) — gates a build
 * behind, e.g., a "beta" or "enterprise" entitlement.
 */
export function ReleaseConstraintsDialog({ release, open, onOpenChange }: ReleaseConstraintsDialogProps) {
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const [detachingId, setDetachingId] = useState<string | null>(null)
  const api = getKeygenApi()

  const loadData = useCallback(async () => {
    if (!release) return
    try {
      setLoading(true)
      const [constraintsRes, entitlementsRes] = await Promise.all([
        api.releases.listConstraints(release.id),
        api.entitlements.list({ limit: 100 }),
      ])
      setConstraints(constraintsRes.data || [])
      setEntitlements(entitlementsRes.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'release constraints')
    } finally {
      setLoading(false)
    }
  }, [api.releases, api.entitlements, release])

  useEffect(() => {
    if (open && release) {
      setSearch('')
      loadData()
    }
  }, [open, release, loadData])

  const attachedEntitlementIds = new Set(
    constraints
      .map(c => {
        const rel = c.relationships?.entitlement?.data
        return rel && !Array.isArray(rel) ? rel.id : undefined
      })
      .filter((id): id is string => Boolean(id))
  )

  const entitlementName = (entitlementId?: string) => {
    const ent = entitlements.find(e => e.id === entitlementId)
    return ent ? `${ent.attributes.name} (${ent.attributes.code})` : entitlementId
  }

  const handleAttach = async (entitlement: Entitlement) => {
    if (!release) return
    try {
      setAttachingId(entitlement.id)
      await api.releases.attachConstraints(release.id, [entitlement.id])
      toast.success(`Constraint added: ${entitlement.attributes.name}`)
      await loadData()
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'constraint')
    } finally {
      setAttachingId(null)
    }
  }

  const handleDetach = async (constraint: Constraint) => {
    if (!release) return
    try {
      setDetachingId(constraint.id)
      await api.releases.detachConstraints(release.id, [constraint.id])
      toast.success('Constraint removed')
      await loadData()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'constraint')
    } finally {
      setDetachingId(null)
    }
  }

  const filteredEntitlements = entitlements.filter((ent) => {
    const q = search.toLowerCase()
    const name = String(ent.attributes.name || '').toLowerCase()
    const code = String(ent.attributes.code || '').toLowerCase()
    return !q || name.includes(q) || code.includes(q)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Entitlement Constraints
            {release && (
              <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                {release.attributes.version}
              </code>
            )}
          </DialogTitle>
          <DialogDescription>
            A license must be entitled to every constraint attached here to download this
            release. With none attached, the release is unrestricted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Attached ({constraints.length})
          </p>
          {loading && constraints.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">Loading...</div>
          ) : constraints.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No constraints — this release is unrestricted.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {constraints.map((constraint) => {
                const entitlementId = (() => {
                  const rel = constraint.relationships?.entitlement?.data
                  return rel && !Array.isArray(rel) ? rel.id : undefined
                })()
                return (
                  <Badge key={constraint.id} variant="secondary" className="gap-1">
                    {entitlementName(entitlementId)}
                    <button
                      type="button"
                      onClick={() => handleDetach(constraint)}
                      disabled={detachingId === constraint.id}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Add a constraint</p>
          <Input
            placeholder="Search entitlements…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ScrollArea className="h-48 rounded-md border">
            <div className="p-2 space-y-1">
              {filteredEntitlements.map((ent) => {
                const attached = attachedEntitlementIds.has(ent.id)
                return (
                  <div key={ent.id} className="flex items-center justify-between p-1.5 rounded text-sm">
                    <span>
                      {ent.attributes.name}
                      <span className="text-muted-foreground"> · {ent.attributes.code}</span>
                    </span>
                    <Button
                      size="sm"
                      variant={attached ? 'secondary' : 'outline'}
                      disabled={attached || attachingId === ent.id}
                      onClick={() => handleAttach(ent)}
                    >
                      {attached ? 'Added' : 'Add'}
                    </Button>
                  </div>
                )
              })}
              {filteredEntitlements.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">No entitlements found</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
