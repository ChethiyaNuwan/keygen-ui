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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { Product, ReleaseChannel } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleFormError } from '@/lib/utils/error-handling'

interface CreateReleaseDialogProps {
  products: Product[]
  onReleaseCreated?: () => void
}

export function CreateReleaseDialog({ products, onReleaseCreated }: CreateReleaseDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    productId: '',
    version: '',
    channel: 'stable' as ReleaseChannel,
    name: '',
    tag: '',
    description: '',
  })

  const api = getKeygenApi()

  const resetForm = () => {
    setFormData({
      productId: '',
      version: '',
      channel: 'stable',
      name: '',
      tag: '',
      description: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.productId) {
      toast.error('Please select a product')
      return
    }
    if (!formData.version.trim()) {
      toast.error('Please enter a version (semver, e.g. 1.2.3)')
      return
    }

    try {
      setLoading(true)

      await api.releases.create({
        productId: formData.productId,
        version: formData.version.trim(),
        channel: formData.channel,
        name: formData.name.trim() || undefined,
        tag: formData.tag.trim() || undefined,
        description: formData.description.trim() || undefined,
      })

      toast.success(`Release ${formData.version} created as draft`)
      resetForm()
      setOpen(false)
      onReleaseCreated?.()
    } catch (error: unknown) {
      handleFormError(error, 'release')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Release
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Release</DialogTitle>
            <DialogDescription>
              Releases are created as drafts. Upload artifacts, then publish to make it downloadable.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData({ ...formData, productId: value })}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.attributes.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="channel">Channel *</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value) => setFormData({ ...formData, channel: value as ReleaseChannel })}
                >
                  <SelectTrigger id="channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="rc">RC</SelectItem>
                    <SelectItem value="beta">Beta</SelectItem>
                    <SelectItem value="alpha">Alpha</SelectItem>
                    <SelectItem value="dev">Dev</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Crystal POS 1.0.0"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tag">Tag</Label>
              <Input
                id="tag"
                placeholder="e.g. latest"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Release notes or changelog..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
