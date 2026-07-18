'use client'

import { useState } from 'react'
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
import { Copy, KeyRound, ShieldAlert } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { License } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleCrudError } from '@/lib/utils/error-handling'

interface GenerateActivationTokenDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GenerateActivationTokenDialog({ license, open, onOpenChange }: GenerateActivationTokenDialogProps) {
  const api = getKeygenApi()
  const [ttl, setTtl] = useState('3600')
  const [name, setName] = useState('')
  const [maxActivations, setMaxActivations] = useState('')
  const [generating, setGenerating] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)

  const reset = () => {
    setTtl('3600')
    setName('')
    setMaxActivations('')
    setSecret(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      const response = await api.licenses.generateActivationToken(license.id, {
        ttl: ttl.trim() ? parseInt(ttl, 10) : undefined,
        name: name.trim() || undefined,
        maxActivations: maxActivations.trim() ? parseInt(maxActivations, 10) : undefined,
      })
      const token = response.data?.attributes.token
      if (token) {
        setSecret(token)
      } else {
        toast.error('Failed to generate activation token')
      }
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'Activation token', { customMessage: 'Failed to generate activation token' })
    } finally {
      setGenerating(false)
    }
  }

  const copySecret = () => {
    if (!secret) return
    navigator.clipboard.writeText(secret)
    toast.success('Token copied to clipboard')
  }

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
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="token-ttl">TTL (seconds)</Label>
                <Input
                  id="token-ttl"
                  type="number"
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                  disabled={generating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token-max-activations">Max Activations</Label>
                <Input
                  id="token-max-activations"
                  type="number"
                  placeholder="Unlimited"
                  value={maxActivations}
                  onChange={(e) => setMaxActivations(e.target.value)}
                  disabled={generating}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-name">Name (optional)</Label>
              <Input
                id="token-name"
                placeholder="e.g. Installer token"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={generating}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {secret ? (
            <Button onClick={() => handleOpenChange(false)}>Close</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={generating}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
