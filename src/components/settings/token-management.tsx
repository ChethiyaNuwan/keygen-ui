'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Token } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { KeyRound, MoreVertical, RefreshCcw, Trash2, Copy, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export function TokenManagement() {
  const api = getKeygenApi()
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)
  const [pendingToken, setPendingToken] = useState<Token | null>(null)
  const [revoking, setRevoking] = useState(false)

  const loadTokens = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.tokens.list({ limit: 100 })
      setTokens(response.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'tokens')
    } finally {
      setLoading(false)
    }
  }, [api.tokens])

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : 'Never')

  const handleRegenerate = async (token: Token) => {
    try {
      setRegenerating(token.id)
      const response = await api.tokens.regenerate(token.id)
      const secret = response.data?.attributes.token
      if (secret) {
        setNewSecret(secret)
        toast.success('Token regenerated — copy the new secret now')
      }
      await loadTokens()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Token', { customMessage: 'Failed to regenerate token' })
    } finally {
      setRegenerating(null)
    }
  }

  const handleRevokeClick = (token: Token) => {
    setPendingToken(token)
    setRevokeConfirmOpen(true)
  }

  const confirmRevoke = async () => {
    if (!pendingToken) return
    try {
      setRevoking(true)
      await api.tokens.revoke(pendingToken.id)
      toast.success('Token revoked')
      setRevokeConfirmOpen(false)
      setPendingToken(null)
      await loadTokens()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Token', { customMessage: 'Failed to revoke token' })
    } finally {
      setRevoking(false)
    }
  }

  const copySecret = async () => {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    toast.success('Copied to clipboard')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          API Tokens
        </CardTitle>
        <CardDescription>
          Account-wide tokens. Revoking one immediately stops anything still using it; regenerating
          issues a new secret and invalidates the old one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newSecret && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Copy this token now</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p className="text-xs">It will not be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1 font-mono text-xs">
                    {newSecret}
                  </code>
                  <Button size="sm" variant="outline" onClick={copySecret}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
            Loading tokens...
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
            No tokens found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    {token.attributes.name || <span className="text-muted-foreground italic">Unnamed</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{token.attributes.kind}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(token.attributes.created)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(token.attributes.expiry)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRegenerate(token)}
                          disabled={regenerating === token.id}
                        >
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          {regenerating === token.id ? 'Regenerating...' : 'Regenerate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleRevokeClick(token)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ConfirmDialog
        open={revokeConfirmOpen}
        onOpenChange={setRevokeConfirmOpen}
        title="Revoke this token?"
        description={
          pendingToken
            ? `Anything using "${pendingToken.attributes.name || 'this token'}" will stop working immediately. This cannot be undone.`
            : ''
        }
        confirmLabel="Revoke"
        destructive
        loading={revoking}
        onConfirm={confirmRevoke}
      />
    </Card>
  )
}
