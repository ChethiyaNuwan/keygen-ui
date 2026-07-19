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
import { Package, Copy } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { toast } from 'sonner'
import { Product } from '@/lib/types/keygen'
import { handleCrudError } from '@/lib/utils/error-handling'

const PLATFORM_OPTIONS = [
  'Windows',
  'macOS',
  'Linux',
  'iOS',
  'Android',
  'Web',
  'Docker',
  'Cloud'
]

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
  name: z.string().trim().min(1, 'Product name is required'),
  code: z.string(),
  url: z.string(),
  distributionStrategy: z.enum(['LICENSED', 'OPEN', 'CLOSED']),
  platforms: z.array(z.string()),
  metadata: z.string().refine(isValidJsonObjectOrEmpty, 'Metadata must be a valid JSON object'),
})

type ProductFormValues = z.infer<typeof productSchema>

function productToFormValues(product: Product): ProductFormValues {
  const a = product.attributes
  return {
    name: a.name || '',
    code: a.code || '',
    url: a.url || '',
    distributionStrategy: a.distributionStrategy || 'LICENSED',
    platforms: a.platforms || [],
    metadata: a.metadata ? JSON.stringify(a.metadata, null, 2) : '',
  }
}

interface EditProductDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductUpdated?: () => void
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
  onProductUpdated
}: EditProductDialogProps) {
  const api = getKeygenApi()

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: productToFormValues(product),
  })

  // Initialize form data when product changes
  useEffect(() => {
    form.reset(productToFormValues(product))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const platforms = form.watch('platforms')

  const handlePlatformToggle = (platform: string, checked: boolean) => {
    if (checked) {
      form.setValue('platforms', [...platforms, platform])
    } else {
      form.setValue('platforms', platforms.filter(p => p !== platform))
    }
  }

  const generateCode = () => {
    const name = form.getValues('name')
    if (name) {
      const code = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '')
      form.setValue('code', code)
    }
  }

  const onSubmit = async (values: ProductFormValues) => {
    if (!product) return

    try {
      const metadata = values.metadata.trim() ? JSON.parse(values.metadata) : undefined

      const productData = {
        name: values.name.trim(),
        distributionStrategy: values.distributionStrategy,
        ...(values.code.trim() && { code: values.code.trim() }),
        ...(values.url.trim() && { url: values.url.trim() }),
        ...(values.platforms.length > 0 && { platforms: values.platforms }),
        ...(metadata && { metadata })
      }

      await api.products.update(product.id, productData)

      toast.success('Product updated successfully')
      onOpenChange(false)
      onProductUpdated?.()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Product')
    }
  }

  const loading = form.formState.isSubmitting
  const nameValue = form.watch('name')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the product information and settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Product ID (Read-only) */}
            <div className="space-y-2">
              <Label>Product ID</Label>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-muted rounded-md font-mono text-xs flex-1 truncate">
                  {product.id}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(product.id)
                    toast.success('Product ID copied to clipboard')
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Basic Information
              </h4>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., My Awesome App" {...field} />
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
                      <FormLabel>Product Code</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="e.g., my-awesome-app" {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateCode}
                          disabled={!nameValue.trim()}
                        >
                          Generate
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Unique identifier for your product
                      </p>
                      <FormMessage />
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
                        <Input type="url" placeholder="https://myapp.com" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Website or documentation URL for your product
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Distribution Strategy */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Distribution Strategy</h4>
              <FormField
                control={form.control}
                name="distributionStrategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategy *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LICENSED">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <div>
                              <div className="font-medium">Licensed</div>
                              <div className="text-xs text-muted-foreground">Requires valid license</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="OPEN">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <div>
                              <div className="font-medium">Open</div>
                              <div className="text-xs text-muted-foreground">Freely available to all</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="CLOSED">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div>
                              <div className="font-medium">Closed</div>
                              <div className="text-xs text-muted-foreground">Access restricted</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Supported Platforms */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Supported Platforms</h4>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORM_OPTIONS.map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-platform-${platform}`}
                      checked={platforms.includes(platform)}
                      onCheckedChange={(checked) =>
                        handlePlatformToggle(platform, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`edit-platform-${platform}`}
                      className="text-sm font-normal"
                    >
                      {platform}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select all platforms that your product supports
              </p>
            </div>

            {/* Metadata */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Metadata (Optional)</h4>
              <FormField
                control={form.control}
                name="metadata"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Metadata (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{&quot;version&quot;: &quot;1.0.0&quot;, &quot;category&quot;: &quot;productivity&quot;}'
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Optional JSON metadata for additional product information
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
