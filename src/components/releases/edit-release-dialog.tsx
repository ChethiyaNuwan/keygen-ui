'use client'

import { useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { getKeygenApi } from '@/lib/api'
import { Release } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleFormError } from '@/lib/utils/error-handling'

const releaseSchema = z.object({
  name: z.string(),
  tag: z.string(),
  description: z.string(),
})

type ReleaseFormValues = z.infer<typeof releaseSchema>

const emptyValues: ReleaseFormValues = { name: '', tag: '', description: '' }

function releaseToFormValues(release: Release | null): ReleaseFormValues {
  if (!release) return emptyValues
  return {
    name: release.attributes.name || '',
    tag: release.attributes.tag || '',
    description: release.attributes.description || '',
  }
}

interface EditReleaseDialogProps {
  release: Release | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReleaseUpdated?: () => void
}

export function EditReleaseDialog({ release, open, onOpenChange, onReleaseUpdated }: EditReleaseDialogProps) {
  const api = getKeygenApi()

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (release) {
      form.reset(releaseToFormValues(release))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [release])

  const onSubmit = async (values: ReleaseFormValues) => {
    if (!release) return

    try {
      await api.releases.update(release.id, {
        name: values.name.trim() || null,
        tag: values.tag.trim() || null,
        description: values.description.trim() || null,
      })

      toast.success('Release updated')
      onOpenChange(false)
      onReleaseUpdated?.()
    } catch (error: unknown) {
      handleFormError(error, 'release')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Release</DialogTitle>
              <DialogDescription>
                {release ? `Version ${release.attributes.version} (${release.attributes.channel})` : ''}
                {' — '}version and channel cannot be changed after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
        </Form>
      </DialogContent>
    </Dialog>
  )
}
