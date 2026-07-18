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
  DialogTrigger,
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
import { Product } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleFormError } from '@/lib/utils/error-handling'

const CHANNELS = ['stable', 'rc', 'beta', 'alpha', 'dev'] as const

const releaseSchema = z.object({
  productId: z.string().min(1, 'Please select a product'),
  version: z.string().trim().min(1, 'Please enter a version (semver, e.g. 1.2.3)'),
  channel: z.enum(CHANNELS),
  name: z.string(),
  tag: z.string(),
  description: z.string(),
})

type ReleaseFormValues = z.infer<typeof releaseSchema>

const defaultValues: ReleaseFormValues = {
  productId: '',
  version: '',
  channel: 'stable',
  name: '',
  tag: '',
  description: '',
}

interface CreateReleaseDialogProps {
  products: Product[]
  onReleaseCreated?: () => void
}

export function CreateReleaseDialog({ products, onReleaseCreated }: CreateReleaseDialogProps) {
  const [open, setOpen] = useState(false)

  const api = getKeygenApi()

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseSchema),
    defaultValues,
  })

  const onSubmit = async (values: ReleaseFormValues) => {
    try {
      await api.releases.create({
        productId: values.productId,
        version: values.version,
        channel: values.channel,
        name: values.name.trim() || undefined,
        tag: values.tag.trim() || undefined,
        description: values.description.trim() || undefined,
      })

      toast.success(`Release ${values.version} created as draft`)
      form.reset(defaultValues)
      setOpen(false)
      onReleaseCreated?.()
    } catch (error: unknown) {
      handleFormError(error, 'release')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Icon-only on phones: the label pushes the header out of shape. */}
        <Button className="max-sm:size-9 max-sm:px-0" aria-label="Create Release">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="max-sm:hidden">Create Release</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create Release</DialogTitle>
              <DialogDescription>
                Releases are created as drafts. Upload artifacts, then publish to make it downloadable.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.attributes.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version *</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="stable">Stable</SelectItem>
                          <SelectItem value="rc">RC</SelectItem>
                          <SelectItem value="beta">Beta</SelectItem>
                          <SelectItem value="alpha">Alpha</SelectItem>
                          <SelectItem value="dev">Dev</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. My App 1.0.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. latest" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Release notes or changelog..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
        </Form>
      </DialogContent>
    </Dialog>
  )
}
