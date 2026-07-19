'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Account } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError } from '@/lib/utils/error-handling'

/**
 * Keygen base64-encodes the ASCII hex string itself (not raw key bytes) for
 * each public key in `meta.keys` — decoding gives the 64-char hex string
 * directly, ready to use as KEYGEN_PUBLIC_KEY. Verified live against the
 * deployed instance.
 */
function decodeMetaKey(base64Value?: string): string | undefined {
  if (!base64Value) return undefined
  try {
    return atob(base64Value)
  } catch {
    return undefined
  }
}

export function AccountInfo() {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)

  const api = getKeygenApi()

  const loadAccount = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.account.get()
      setAccount(response.data || null)
    } catch (error: unknown) {
      handleLoadError(error, 'account')
    } finally {
      setLoading(false)
    }
  }, [api.account])

  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  const copyValue = (value: string, label: string) => {
    navigator.clipboard.writeText(value)
    toast.success(`${label} copied to clipboard`)
  }

  const ed25519Key = decodeMetaKey(account?.meta?.keys?.ed25519)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Account
        </CardTitle>
        <CardDescription>
          Details about this Keygen account, including the public key used to
          verify signed license files offline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : account ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm mt-1">{account.attributes.name || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">API Version</label>
                <p className="text-sm mt-1">{account.attributes.apiVersion || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant="outline">{account.attributes.status || 'unknown'}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                    {account.id}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0"
                    onClick={() => copyValue(account.id, 'Account ID')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Public Key (Ed25519)
              </label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1">
                Public — safe to embed in any client that needs to verify signed
                license files offline. It only verifies signatures; it never
                authenticates a request.
              </p>
              {ed25519Key ? (
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
                    {ed25519Key}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0"
                    onClick={() => copyValue(ed25519Key, 'Public key')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not available</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Could not load account information</p>
        )}
      </CardContent>
    </Card>
  )
}
