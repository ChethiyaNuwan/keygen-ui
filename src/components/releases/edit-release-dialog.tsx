'use client'

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { getKeygenApi } from '@/lib/api'
import { Release } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleFormError } from '@/lib/utils/error-handling'

interface EditReleaseDialogProps {
  release: Release | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReleaseUpdated?: () => void
}

export function EditReleaseDialog({ release, open, onOpenChange, onReleaseUpdated }: EditReleaseDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    description: '',
  })

  const api = getKeygenApi()

  useEffect(() => {
    if (release) {
      setFormData({
        name: release.attributes.name || '',
        tag: release.attributes.tag || '',
        description: release.attributes.description || '',
      })
    }
  }, [release])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!release) return

    try {
      setLoading(true)

      await api.releases.update(release.id, {
        name: formData.name.trim() || null,
        tag: formData.tag.trim() || null,
        description: formData.description.trim() || null,
      })

      toast.success('Release updated')
      onOpenChange(false)
      onReleaseUpdated?.()
    } catch (error: unknown) {
      handleFormError(error, 'release')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Release</DialogTitle>
            <DialogDescription>
              {release ? `Version ${release.attributes.version} (${release.attributes.channel})` : ''}
              {' — '}version and channel cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tag">Tag</Label>
              <Input
                id="edit-tag"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
