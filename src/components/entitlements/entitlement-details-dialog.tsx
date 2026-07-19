'use client'

import { useState, useEffect, useCallback } from 'react'
import { Entitlement, Policy } from '@/lib/types/keygen'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, KeyRound, Calendar, Info, Code } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/format'
import { getKeygenApi } from '@/lib/api'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'

interface EntitlementDetailsDialogProps {
  entitlement: Entitlement
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EntitlementDetailsDialog({
  entitlement,
  open,
  onOpenChange
}: EntitlementDetailsDialogProps) {
  const api = getKeygenApi()

  const [policies, setPolicies] = useState<Policy[]>([])
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [selectedPolicyId, setSelectedPolicyId] = useState('')
  const [attaching, setAttaching] = useState(false)

  const loadPolicies = useCallback(async () => {
    try {
      setPoliciesLoading(true)
      const response = await api.policies.list({ limit: 100 })
      setPolicies(response.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'policies')
    } finally {
      setPoliciesLoading(false)
    }
  }, [api.policies])

  useEffect(() => {
    if (open) {
      setSelectedPolicyId('')
      loadPolicies()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleAttach = async () => {
    if (!selectedPolicyId) return
    try {
      setAttaching(true)
      await api.policies.attachEntitlements(selectedPolicyId, [entitlement.id])
      const policy = policies.find((p) => p.id === selectedPolicyId)
      toast.success(`Attached to ${policy?.attributes.name ?? 'policy'}`)
      setSelectedPolicyId('')
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'Entitlement')
    } finally {
      setAttaching(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Entitlement Details: {entitlement.attributes.name}
          </DialogTitle>
          <DialogDescription>
            View detailed information about this entitlement and its usage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Entitlement Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Entitlement Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm">{entitlement.attributes.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Code</label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      <Code className="h-3 w-3 mr-1" />
                      {entitlement.attributes.code}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <p className="text-sm font-mono text-muted-foreground">{entitlement.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDateTime(entitlement.attributes.created)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Updated</label>
                  <p className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDateTime(entitlement.attributes.updated)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attach to a policy.

              Keygen has no endpoint for "which policies/licences already carry
              this entitlement" — /entitlements is a flat resource, and neither
              /policies nor /licenses support filtering by entitlement — so
              there's no cheap way to show current attachment state here (it
              would mean one /policies/:id/entitlements call per policy). This
              only offers the one-way attach action; detaching, or checking
              what's already attached, stays on the policy/licence's own
              details dialog, which already loads its own attached list. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Attach to a policy
              </CardTitle>
              <CardDescription>
                Grants this entitlement to every licence under the chosen policy.
                For a one-off grant to a single licence, attach it from that
                licence&apos;s own details dialog instead.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={policiesLoading ? 'Loading policies…' : 'Select a policy'} />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.attributes.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAttach} disabled={!selectedPolicyId || attaching}>
                {attaching ? 'Attaching…' : 'Attach'}
              </Button>
            </CardContent>
          </Card>

          {/* Usage Information */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Integration Code:</strong> Use the entitlement code{' '}
                  <Badge variant="secondary" className="font-mono text-xs mx-1">
                    {entitlement.attributes.code}
                  </Badge>
                  in your application to check if a license has access to this feature.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: Check if a license includes this entitlement before enabling the feature.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
