'use client'

import { useEffect, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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

const tokenSchema = z.object({
  name: z.string(),
})

type TokenFormValues = z.infer<typeof tokenSchema>

const defaultValues: TokenFormValues = { name: '' }

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
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const api = getKeygenApi()

  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues,
  })

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
      form.reset(defaultValues)
      loadTokens()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product, loadTokens])

  const onSubmit = async (values: TokenFormValues) => {
    if (!product) return

    try {
      const response = await api.products.createToken(product.id, {
        name: values.name.trim() || undefined,
      })

      // The secret is only ever present on this response — never readable again.
      const secret = response.data?.attributes.token
      if (secret) {
        setNewSecret(secret)
        toast.success('Token created — copy it now')
      }
      form.reset(defaultValues)
      loadTokens()
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'token')
    }
  }

  const copySecret = async () => {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    toast.success('Copied to clipboard')
  }

  const creating = form.formState.isSubmitting

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. CI release pipeline" disabled={creating} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create token'}
            </Button>
          </form>
        </Form>

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
