'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { Release, Product, ReleaseStatus } from '@/lib/types/keygen'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  MoreVertical,
  Rocket,
  Upload,
  Edit,
  Trash2,
  Send,
  Ban,
  FileArchive,
} from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { CreateReleaseDialog } from './create-release-dialog'
import { EditReleaseDialog } from './edit-release-dialog'
import { DeleteReleaseDialog } from './delete-release-dialog'
import { ReleaseArtifactsDialog } from './release-artifacts-dialog'

export function ReleaseManagement() {
  const [releases, setReleases] = useState<Release[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [editRelease, setEditRelease] = useState<Release | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteRelease, setDeleteRelease] = useState<Release | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [artifactsRelease, setArtifactsRelease] = useState<Release | null>(null)
  const [artifactsDialogOpen, setArtifactsDialogOpen] = useState(false)
  const api = getKeygenApi()

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.releases.list({ limit: 100 })
      setReleases(response.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'releases')
    } finally {
      setLoading(false)
    }
  }, [api.releases])

  const loadProducts = useCallback(async () => {
    try {
      const response = await api.products.list({ limit: 100 })
      setProducts(response.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'products')
    }
  }, [api.products])

  useEffect(() => {
    loadReleases()
    loadProducts()
  }, [loadReleases, loadProducts])

  const productName = (release: Release): string => {
    const rel = release.relationships?.product?.data
    const productId = rel && !Array.isArray(rel) ? rel.id : undefined
    const product = products.find(p => p.id === productId)
    return product?.attributes.name || 'Unknown'
  }

  const filteredReleases = releases.filter(release => {
    const matchesSearch = !searchTerm ||
      release.attributes.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      release.attributes.version?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      release.attributes.tag?.toLowerCase().includes(searchTerm.toLowerCase())

    const rel = release.relationships?.product?.data
    const releaseProductId = rel && !Array.isArray(rel) ? rel.id : undefined
    const matchesProduct = productFilter === 'all' || releaseProductId === productFilter
    const matchesChannel = channelFilter === 'all' || release.attributes.channel === channelFilter

    return matchesSearch && matchesProduct && matchesChannel
  })

  const getStatusColor = (status: ReleaseStatus) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800 border-green-200'
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'YANKED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'stable': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'rc': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'beta': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handlePublish = async (release: Release) => {
    try {
      await api.releases.publish(release.id)
      toast.success(`Release ${release.attributes.version} published`)
      loadReleases()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'release', { customMessage: 'Failed to publish release' })
    }
  }

  const handleYank = async (release: Release) => {
    try {
      await api.releases.yank(release.id)
      toast.success(`Release ${release.attributes.version} yanked`)
      loadReleases()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'release', { customMessage: 'Failed to yank release' })
    }
  }

  const handleArtifacts = (release: Release) => {
    setArtifactsRelease(release)
    setArtifactsDialogOpen(true)
  }

  const handleEdit = (release: Release) => {
    setEditRelease(release)
    setEditDialogOpen(true)
  }

  const handleDelete = (release: Release) => {
    setDeleteRelease(release)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Releases</h1>
          <p className="text-muted-foreground">
            Distribute versioned builds and updates of your products
          </p>
        </div>
        <CreateReleaseDialog products={products} onReleaseCreated={loadReleases} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Releases</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{releases.length}</div>
            <p className="text-xs text-muted-foreground">All channels</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {releases.filter(r => r.attributes.status === 'PUBLISHED').length}
            </div>
            <p className="text-xs text-muted-foreground">Available for download</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {releases.filter(r => r.attributes.status === 'DRAFT').length}
            </div>
            <p className="text-xs text-muted-foreground">Not yet published</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yanked</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {releases.filter(r => r.attributes.status === 'YANKED').length}
            </div>
            <p className="text-xs text-muted-foreground">Access revoked</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by version, name or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map(product => (
              <SelectItem key={product.id} value={product.id}>
                {product.attributes.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="stable">Stable</SelectItem>
            <SelectItem value="rc">RC</SelectItem>
            <SelectItem value="beta">Beta</SelectItem>
            <SelectItem value="alpha">Alpha</SelectItem>
            <SelectItem value="dev">Dev</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Releases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Release List</CardTitle>
          <CardDescription>
            All releases across your products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">Loading releases...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReleases.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                        {release.attributes.version}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {release.attributes.name || <span className="text-muted-foreground font-normal">Unnamed</span>}
                      </div>
                    </TableCell>
                    <TableCell>{productName(release)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${getChannelColor(release.attributes.channel)} w-fit`}
                      >
                        {release.attributes.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(release.attributes.status)} w-fit`}
                      >
                        {release.attributes.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(release.attributes.created)}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleArtifacts(release)}>
                            <FileArchive className="mr-2 h-4 w-4" />
                            Artifacts
                          </DropdownMenuItem>
                          {release.attributes.status === 'DRAFT' && (
                            <DropdownMenuItem onClick={() => handlePublish(release)}>
                              <Send className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {release.attributes.status === 'PUBLISHED' && (
                            <DropdownMenuItem onClick={() => handleYank(release)}>
                              <Ban className="mr-2 h-4 w-4" />
                              Yank
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEdit(release)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(release)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredReleases.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Rocket className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <div className="text-sm font-medium">No releases found</div>
                <div className="text-xs text-muted-foreground">
                  {searchTerm || productFilter !== 'all' || channelFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first release'
                  }
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditReleaseDialog
        release={editRelease}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onReleaseUpdated={loadReleases}
      />

      <DeleteReleaseDialog
        release={deleteRelease}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onReleaseDeleted={loadReleases}
      />

      <ReleaseArtifactsDialog
        release={artifactsRelease}
        open={artifactsDialogOpen}
        onOpenChange={setArtifactsDialogOpen}
      />
    </div>
  )
}
