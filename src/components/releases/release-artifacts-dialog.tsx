'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Upload, Download, Trash2, FileArchive, Loader2, RefreshCw } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { Release, ReleaseArtifact, ArtifactStatus } from '@/lib/types/keygen'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'

interface ReleaseArtifactsDialogProps {
  release: Release | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Fallbacks only: the real lists come from the server (Keygen derives them from
// the artifacts already uploaded), so the dropdowns match what you actually ship.
const FALLBACK_PLATFORMS = ['windows', 'darwin', 'linux']
const FALLBACK_ARCHES = ['x86_64', 'amd64', 'arm64', '386']

export function ReleaseArtifactsDialog({ release, open, onOpenChange }: ReleaseArtifactsDialogProps) {
  const [artifacts, setArtifacts] = useState<ReleaseArtifact[]>([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [platform, setPlatform] = useState<string>('none')
  const [arch, setArch] = useState<string>('none')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [platforms, setPlatforms] = useState<string[]>(FALLBACK_PLATFORMS)
  const [arches, setArches] = useState<string[]>(FALLBACK_ARCHES)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const api = getKeygenApi()

  const loadArtifacts = useCallback(async () => {
    if (!release) return
    try {
      setLoading(true)
      const response = await api.releases.listArtifacts(release.id)
      setArtifacts(response.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'artifacts')
    } finally {
      setLoading(false)
    }
  }, [api.releases, release])

  useEffect(() => {
    if (open && release) {
      loadArtifacts()
    }
  }, [open, release, loadArtifacts])

  // Known platforms/arches, so the dropdowns reflect what has really been
  // published rather than a hardcoded guess. Falls back if the call fails.
  useEffect(() => {
    if (!open) return

    ;(async () => {
      try {
        const [platformsResponse, archesResponse] = await Promise.all([
          api.releaseMetadata.platforms(),
          api.releaseMetadata.arches(),
        ])

        const platformKeys = (platformsResponse.data || []).map(p => p.attributes.key)
        const archKeys = (archesResponse.data || []).map(a => a.attributes.key)

        if (platformKeys.length) setPlatforms(platformKeys)
        if (archKeys.length) setArches(archKeys)
      } catch {
        // Keep the fallbacks — this is a convenience, not a requirement.
      }
    })()
  }, [open, api.releaseMetadata])

  // Clear poll timers when the dialog closes or unmounts
  useEffect(() => {
    const timers = pollTimersRef.current
    if (!open) {
      timers.forEach(timer => clearTimeout(timer))
      timers.clear()
      setProcessingIds(new Set())
    }
    return () => {
      timers.forEach(timer => clearTimeout(timer))
      timers.clear()
    }
  }, [open])

  /**
   * Poll a freshly uploaded artifact until the server-side worker marks it
   * UPLOADED (it checks storage every ~30s, so this can take a minute).
   */
  const pollArtifactStatus = useCallback((artifactId: string, attempts = 0) => {
    if (attempts > 24) { // ~2 minutes
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(artifactId)
        return next
      })
      return
    }

    const timer = setTimeout(async () => {
      pollTimersRef.current.delete(artifactId)
      try {
        const response = await api.artifacts.get(artifactId)
        const status = response.data?.attributes.status

        if (status === 'UPLOADED' || status === 'FAILED') {
          setProcessingIds(prev => {
            const next = new Set(prev)
            next.delete(artifactId)
            return next
          })
          if (status === 'UPLOADED') {
            toast.success('Artifact processed and ready for download')
          } else {
            toast.error('Artifact processing failed')
          }
          loadArtifacts()
          return
        }
      } catch {
        // Transient polling error — keep trying
      }
      pollArtifactStatus(artifactId, attempts + 1)
    }, 5000)

    pollTimersRef.current.set(artifactId, timer)
  }, [api.artifacts, loadArtifacts])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    setFile(selected)

    // Best-effort platform guess from the filename
    if (selected) {
      const name = selected.name.toLowerCase()
      if (name.endsWith('.exe') || name.endsWith('.msi') || name.includes('windows') || name.includes('win')) {
        setPlatform('windows')
      } else if (name.endsWith('.dmg') || name.endsWith('.pkg') || name.includes('darwin') || name.includes('mac')) {
        setPlatform('darwin')
      } else if (name.endsWith('.appimage') || name.endsWith('.deb') || name.endsWith('.rpm') || name.includes('linux')) {
        setPlatform('linux')
      }
    }
  }

  const handleUpload = async () => {
    if (!release || !file) {
      toast.error('Please choose a file to upload')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      const filetype = file.name.includes('.')
        ? file.name.split('.').pop()
        : undefined

      const { artifact, uploadUrl } = await api.artifacts.create({
        releaseId: release.id,
        filename: file.name,
        filesize: file.size,
        filetype,
        platform: platform !== 'none' ? platform : undefined,
        arch: arch !== 'none' ? arch : undefined,
      })

      await api.artifacts.uploadFile(uploadUrl, file, setUploadProgress)

      toast.success('Upload complete — processing on server (can take ~1 min)')
      setFile(null)
      setPlatform('none')
      setArch('none')
      if (fileInputRef.current) fileInputRef.current.value = ''

      setProcessingIds(prev => new Set(prev).add(artifact.id))
      pollArtifactStatus(artifact.id)
      loadArtifacts()
    } catch (error: unknown) {
      handleCrudError(error, 'create', 'artifact', {
        customMessage: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDownload = async (artifact: ReleaseArtifact) => {
    try {
      const url = await api.artifacts.getDownloadUrl(artifact.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error: unknown) {
      handleLoadError(error, 'download URL', {
        customMessage: 'Could not get download URL — the artifact may still be processing',
      })
    }
  }

  const handleDelete = async (artifact: ReleaseArtifact) => {
    try {
      await api.artifacts.delete(artifact.id)
      toast.success(`Artifact ${artifact.attributes.filename} deleted`)
      loadArtifacts()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'artifact')
    }
  }

  const getStatusBadge = (artifact: ReleaseArtifact) => {
    const status = artifact.attributes.status
    const isPolling = processingIds.has(artifact.id)
    const colorFor = (s: ArtifactStatus) => {
      switch (s) {
        case 'UPLOADED': return 'bg-green-100 text-green-800 border-green-200'
        case 'WAITING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        case 'PROCESSING': return 'bg-blue-100 text-blue-800 border-blue-200'
        case 'FAILED': return 'bg-red-100 text-red-800 border-red-200'
        case 'YANKED': return 'bg-red-100 text-red-800 border-red-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }
    return (
      <Badge variant="outline" className={`${colorFor(status)} flex items-center gap-1 w-fit`}>
        {(isPolling || status === 'PROCESSING') && <Loader2 className="h-3 w-3 animate-spin" />}
        {status.toLowerCase()}
      </Badge>
    )
  }

  const formatBytes = (bytes?: number | null) => {
    if (!bytes) return '—'
    const units = ['B', 'KB', 'MB', 'GB']
    let value = bytes
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024
      unit++
    }
    return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Artifacts
            {release && (
              <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                {release.attributes.version}
              </code>
            )}
          </DialogTitle>
          <DialogDescription>
            Upload the build files for this release. Files go directly to your storage
            server; processing after upload can take about a minute.
          </DialogDescription>
        </DialogHeader>

        {/* Upload form */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2 md:col-span-1">
              <Label htmlFor="artifact-file">File</Label>
              <Input
                id="artifact-file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="artifact-platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform} disabled={uploading}>
                <SelectTrigger id="artifact-platform">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {platforms.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="artifact-arch">Architecture</Label>
              <Select value={arch} onValueChange={setArch} disabled={uploading}>
                <SelectTrigger id="artifact-arch">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {arches.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {uploading && (
            <div className="space-y-1">
              <Progress value={uploadProgress} />
              <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Artifact
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Artifact list */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {artifacts.length} artifact{artifacts.length === 1 ? '' : 's'}
          </p>
          <Button variant="ghost" size="sm" onClick={loadArtifacts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading && artifacts.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <div className="text-sm text-muted-foreground">Loading artifacts...</div>
          </div>
        ) : artifacts.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <div className="text-center">
              <FileArchive className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
              <div className="text-xs text-muted-foreground">
                No artifacts yet — upload the first build above
              </div>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Arch</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[90px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artifacts.map((artifact) => (
                <TableRow key={artifact.id}>
                  <TableCell>
                    <code className="text-xs font-mono">{artifact.attributes.filename}</code>
                  </TableCell>
                  <TableCell>
                    {artifact.attributes.platform || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {artifact.attributes.arch || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{formatBytes(artifact.attributes.filesize)}</TableCell>
                  <TableCell>{getStatusBadge(artifact)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(artifact)}
                        disabled={artifact.attributes.status !== 'UPLOADED'}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(artifact)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
