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
import { getKeygenApi } from '@/lib/api'
import { Release } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleCrudError } from '@/lib/utils/error-handling'
import { AlertTriangle } from 'lucide-react'

interface DeleteReleaseDialogProps {
  release: Release | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReleaseDeleted?: () => void
}

export function DeleteReleaseDialog({ release, open, onOpenChange, onReleaseDeleted }: DeleteReleaseDialogProps) {
  const [loading, setLoading] = useState(false)
  const api = getKeygenApi()

  const handleDelete = async () => {
    if (!release) return

    try {
      setLoading(true)
      await api.releases.delete(release.id)
      toast.success(`Release ${release.attributes.version} deleted`)
      onOpenChange(false)
      onReleaseDeleted?.()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'release', {
        onNotFound: () => {
          onOpenChange(false)
          onReleaseDeleted?.()
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Release
          </DialogTitle>
          <DialogDescription>
            This permanently deletes release{' '}
            <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
              {release?.attributes.version}
            </code>{' '}
            and all of its artifacts. Terminals will no longer be able to download this
            version. If you only want to revoke access, yank the release instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Release'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
