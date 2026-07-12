'use client'

import { Entitlement } from '@/lib/types/keygen'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, KeyRound, Calendar, Info, Code } from 'lucide-react'
// toast not needed; using centralized error handlers

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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    {formatDate(entitlement.attributes.created)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Updated</label>
                  <p className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(entitlement.attributes.updated)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Where this entitlement is used.

              Keygen has no endpoint for "which licences carry this entitlement"
              — /entitlements is a flat resource and /licenses has no entitlement
              filter — so this explains the relationship rather than faking a list. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Where it applies
              </CardTitle>
              <CardDescription>
                Entitlements are attached to licences and policies, not the other way round
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Attach this entitlement to a <strong>policy</strong> to grant it to every
                licence under that policy, or to an individual <strong>licence</strong> for
                a one-off. Do that from the policy or licence itself.
              </p>
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
