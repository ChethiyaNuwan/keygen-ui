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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Shield, Unlock, Lock } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { toast } from 'sonner'
import { handleFormError } from '@/lib/utils/error-handling'
import { PLATFORM_OPTIONS } from '@/lib/constants'

function isValidJsonObjectOrEmpty(value: string): boolean {
  if (!value.trim()) return true
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}

const productSchema = z.object({
  name: z.string().trim().min(1, 'Please enter a product name'),
  code: z.string(),
  url: z.string(),
  distributionStrategy: z.enum(['LICENSED', 'OPEN', 'CLOSED']),
  platforms: z.array(z.string()),
  metadata: z.string().refine(isValidJsonObjectOrEmpty, 'Metadata must be a valid JSON object'),
})

type ProductFormValues = z.infer<typeof productSchema>

const defaultValues: ProductFormValues = {
  name: '',
  code: '',
  url: '',
  distributionStrategy: 'LICENSED',
  platforms: [],
  metadata: '',
}

interface CreateProductDialogProps {
  onProductCreated?: () => void
}

export function CreateProductDialog({ onProductCreated }: CreateProductDialogProps) {
  const [open, setOpen] = useState(false)

  const api = getKeygenApi()

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  })

  const platforms = form.watch('platforms')

  const handlePlatformToggle = (platform: string, checked: boolean) => {
    if (checked) {
      form.setValue('platforms', [...platforms, platform])
    } else {
      form.setValue('platforms', platforms.filter(p => p !== platform))
    }
  }

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const metadata = values.metadata.trim() ? JSON.parse(values.metadata) : undefined

      await api.products.create({
        name: values.name,
        code: values.code || undefined,
        url: values.url || undefined,
        distributionStrategy: values.distributionStrategy,
        platforms: values.platforms.length > 0 ? values.platforms : undefined,
        metadata,
      })

      toast.success('Product created successfully')
      setOpen(false)
      form.reset(defaultValues)
      onProductCreated?.()
    } catch (error: unknown) {
      handleFormError(error, 'Product')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Icon-only on phones: the label pushes the header out of shape. */}
        <Button className="max-sm:size-9 max-sm:px-0" aria-label="Create Product">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="max-sm:hidden">Create Product</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Create a new product for your licensing system. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Product" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="my-awesome-product" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Unique identifier for the product
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="distributionStrategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Distribution Strategy</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        {/* SelectValue mirrors the chosen item, icon included — do not
                            render the icon here as well. */}
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LICENSED">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Licensed
                        </div>
                      </SelectItem>
                      <SelectItem value="OPEN">
                        <div className="flex items-center gap-2">
                          <Unlock className="h-4 w-4" />
                          Open
                        </div>
                      </SelectItem>
                      <SelectItem value="CLOSED">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Closed
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORM_OPTIONS.map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={`create-platform-${platform}`}
                      checked={platforms.includes(platform)}
                      onCheckedChange={(checked) =>
                        handlePlatformToggle(platform, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`create-platform-${platform}`}
                      className="text-sm font-normal"
                    >
                      {platform}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="metadata"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metadata (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{&quot;version&quot;: &quot;1.0.0&quot;, &quot;description&quot;: &quot;Product description&quot;}'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Optional JSON metadata for the product
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  form.reset(defaultValues)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
