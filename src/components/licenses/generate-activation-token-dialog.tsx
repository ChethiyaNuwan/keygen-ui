'use client'

import { useState } from 'react'
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
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Copy, KeyRound, ShieldAlert } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { License } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleCrudError } from '@/lib/utils/error-handling'

function isValidPositiveIntOrEmpty(value: string): boolean {
  if (!value.trim()) return true
  return /^\d+$/.test(value.trim())
}

const tokenSchema = z.object({
  ttl: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number of seconds'),
  name: z.string(),
  maxActivations: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number'),
})

type TokenFormValues = z.infer<typeof tokenSchema>

const defaultValues: TokenFormValues = {
  ttl: '3600',
  name: '',
  maxActivations: '',
}

interface GenerateActivationTokenDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GenerateActivationTokenDialog({ license, open, onOpenChange }: GenerateActivationTokenDialogProps) {
  const api = getKeygenApi()
  const [secret, setSecret] = useState<string | null>(null)

  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues,
  })

  const reset = () => {
    form.reset(defaultValues)
    setSecret(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const onSubmit = async (values: TokenFormValues) => {
    try {
      const response = await api.licenses.generateActivationToken(license.id, {
        ttl: values.ttl.trim() ? parseInt(values.ttl, 10) : undefined,
        name: values.name.trim() || undefined,
        maxActivations: values.maxActivations.trim() ? parseInt(values.maxActivations, 10) : undefined,
      })
      const token = response.data?.attributes.token
      if (token) {
        setSecret(token)
      } else {
        toast.error('Failed to generate activation token')
      }
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'Activation token', { customMessage: 'Failed to generate activation token' })
    }
  }

  const copySecret = () => {
    if (!secret) return
    navigator.clipboard.writeText(secret)
    toast.success('Token copied to clipboard')
  }

  const generating = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Generate Activation Token
          </DialogTitle>
          <DialogDescription>
            Issue a short-lived token scoped to this license, for a client app to activate a
            machine without holding a longer-lived credential.
          </DialogDescription>
        </DialogHeader>

        {secret ? (
          <>
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Copy this token now</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="text-xs">It will not be shown again.</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1 font-mono text-xs">
                      {secret}
                    </code>
                    <Button size="sm" variant="outline" onClick={copySecret}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ttl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TTL (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" disabled={generating} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxActivations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Activations</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Unlimited" disabled={generating} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Installer token" disabled={generating} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={generating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={generating}>
                  {generating ? 'Generating...' : 'Generate'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
