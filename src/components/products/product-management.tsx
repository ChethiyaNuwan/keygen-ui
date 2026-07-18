'use client'

import { useState, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Product, KeygenListResponse } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  MoreVertical,
  Package,
  Shield,
  Unlock,
  Lock,
  Edit,
  Trash2,
  ExternalLink,
  KeyRound,
} from 'lucide-react'
// No direct toasts here; using centralized error handlers where needed
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { formatDate } from '@/lib/utils/format'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useDebounce } from '@/hooks/use-debounce'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { CreateProductDialog } from './create-product-dialog'
import { EditProductDialog } from './edit-product-dialog'
import { ProductTokensDialog } from './product-tokens-dialog'

const SEARCH_DEBOUNCE_MS = 300

export function ProductManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [tokensProduct, setTokensProduct] = useState<Product | null>(null)
  const [tokensDialogOpen, setTokensDialogOpen] = useState(false)
  const api = getKeygenApi()

  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)

  // ProductsController registers no has_scope calls at all — `open`/
  // `licensed`/`closed` scopes exist on the model but are never wired up to
  // the index action, so there is no server-side way to filter by
  // distribution strategy. Under real pagination that would mean a strategy
  // filter only ever matches whatever happens to be on the current page, so
  // (as with policies' type filter) it was dropped rather than shipped
  // broken; the strategy stat cards below are relabeled "this page".
  const fetchProducts = useCallback(async (page: number, pageSize: number): Promise<KeygenListResponse<Product>> => {
    try {
      const trimmed = debouncedSearch.trim()
      if (trimmed.length >= 3) {
        return await api.search.search<Product>({
          type: 'products',
          query: { name: trimmed },
          page: { size: pageSize, number: page },
        })
      }

      return await api.products.list({ page: { size: pageSize, number: page } })
    } catch (error: unknown) {
      handleLoadError(error, 'products')
      return { data: [], meta: { count: 0 } }
    }
  }, [api.products, api.search, debouncedSearch])

  const {
    data: products,
    loading,
    page: currentPage,
    setPage: setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    reload: loadProducts,
  } = usePaginatedList<Product>({
    fetcher: fetchProducts,
    resetOn: [debouncedSearch],
  })

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'LICENSED': return 'bg-green-100 text-green-800 border-green-200'
      case 'OPEN': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'CLOSED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'LICENSED': return <Shield className="h-3 w-3" />
      case 'OPEN': return <Unlock className="h-3 w-3" />
      case 'CLOSED': return <Lock className="h-3 w-3" />
      default: return <Package className="h-3 w-3" />
    }
  }

  const handleDeleteProduct = (product: Product) => {
    setDeleteProduct(product)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteProduct = async () => {
    if (!deleteProduct) return
    try {
      setDeleting(true)
      await api.products.delete(deleteProduct.id)
      toast.success(`Product "${deleteProduct.attributes.name}" deleted successfully`)
      setDeleteDialogOpen(false)
      await loadProducts()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'Product', {
        onNotFound: () => { setDeleteDialogOpen(false); loadProducts() },
      })
    } finally {
      setDeleting(false)
    }
  }

  const openUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // Invalid URL, do nothing
    }
  }

  const handleTokens = (product: Product) => {
    setTokensProduct(product)
    setTokensDialogOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditProduct(product)
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your software products and distribution strategies
          </p>
        </div>
        <CreateProductDialog onProductCreated={loadProducts} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              Registered products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licensed (this page)</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.attributes.distributionStrategy === 'LICENSED').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Licensed products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open (this page)</CardTitle>
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.attributes.distributionStrategy === 'OPEN').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Open products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex min-h-[3.25rem] flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed (this page)</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.attributes.distributionStrategy === 'CLOSED').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Private products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="basis-full sm:basis-auto flex-1 sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>
            A list of all products in your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={Math.min(pageSize, 10)} columns={7} />
              ) : products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium">{product.attributes.name}</div>
                    </TableCell>
                    <TableCell>
                      {product.attributes.code ? (
                        <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                          {product.attributes.code}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">No code</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${getStrategyColor(product.attributes.distributionStrategy)} flex items-center gap-1 w-fit`}
                      >
                        {getStrategyIcon(product.attributes.distributionStrategy)}
                        {product.attributes.distributionStrategy?.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.attributes.url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUrl(product.attributes.url!)}
                          className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {product.attributes.url}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">No URL</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.attributes.platforms && product.attributes.platforms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.attributes.platforms.slice(0, 2).map((platform, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                          {product.attributes.platforms.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{product.attributes.platforms.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No platforms</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(product.attributes.created)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTokens(product)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Tokens
                          </DropdownMenuItem>
                          {product.attributes.url && (
                            <DropdownMenuItem onClick={() => openUrl(product.attributes.url!)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Visit URL
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <EmptyState
                  icon={Package}
                  colSpan={7}
                  title="No products found"
                  description={
                    searchTerm
                      ? 'Try adjusting your search'
                      : 'Get started by creating your first product'
                  }
                />
              )}
            </TableBody>
          </Table>

          {!loading && (
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={totalCount}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <EditProductDialog
        product={editProduct}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProductUpdated={loadProducts}
      />

      {/* Delete Product Dialog */}
      <ProductTokensDialog
        product={tokensProduct}
        open={tokensDialogOpen}
        onOpenChange={setTokensDialogOpen}
      />

      {deleteProduct && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Product"
          description={
            <>
              This will permanently delete{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                {deleteProduct.attributes.name}
              </code>{' '}
              and may affect related licenses and policies.
            </>
          }
          confirmLabel="Delete Product"
          destructive
          loading={deleting}
          onConfirm={confirmDeleteProduct}
        />
      )}
    </div>
  )
}
