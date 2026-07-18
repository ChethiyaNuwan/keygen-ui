'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Copy, KeyRound, Loader2, ShieldAlert } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { Product, Token } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleCrudError, handleLoadError } from '@/lib/utils/error-handling'
import { formatDateTime } from '@/lib/utils/format'

interface ProductTokensDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Product-scoped API tokens.
 *
 * These are what a build pipeline should use to publish releases: a product
 * token can only act on this product, so a leaked CI secret cannot touch
 * licences or other products the way an admin token could.
 */
export function ProductTokensDialog({ product, open, onOpenChange }: ProductTokensDialogProps) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const api = getKeygenApi()

  const loadTokens = useCallback(async () => {
    if (!product) return
    try {
      setLoading(true)
      const response = await api.products.listTokens(product.id)
      setTokens(response.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'tokens')
    } finally {
      setLoading(false)
    }
  }, [api.products, product])

  useEffect(() => {
    if (open && product) {
      setNewSecret(null)
      setName('')
      loadTokens()
    }
  }, [open, product, loadTokens])

  const handleCreate = async () => {
    if (!product) return

    try {
      setCreating(true)
      const response = await api.products.createToken(product.id, {
        name: name.trim() || undefined,
      })

      // The secret is only ever present on this response — never readable again.
      const secret = response.data?.attributes.token
      if (secret) {
        setNewSecret(secret)
        toast.success('Token created — copy it now')
      }
      setName('')
      loadTokens()
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'token')
    } finally {
      setCreating(false)
    }
  }

  const copySecret = async () => {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    toast.success('Copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Product Tokens
            {product && (
              <span className="text-muted-foreground text-sm font-normal">
                {product.attributes.name}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Scoped to this product only — use one of these in CI to publish releases,
            rather than an admin token.
          </DialogDescription>
        </DialogHeader>

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

        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="token-name">Name</Label>
            <Input
              id="token-name"
              placeholder="e.g. CI release pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={creating}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create token'}
          </Button>
        </div>

        {loading && tokens.length === 0 ? (
          <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
            Loading tokens...
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-muted-foreground flex h-20 items-center justify-center text-xs">
            No tokens yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    {token.attributes.name || (
                      <span className="text-muted-foreground">Unnamed</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDateTime(token.attributes.created)}</TableCell>
                  <TableCell>{formatDateTime(token.attributes.expiry, 'Never')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
