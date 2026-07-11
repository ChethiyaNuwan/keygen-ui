import { KeygenClient } from '../client';
import {
  ReleaseArtifact,
  ArtifactFilters,
  KeygenResponse,
  KeygenListResponse,
} from '../../types/keygen';

export class ArtifactResource {
  constructor(private client: KeygenClient) {}

  /**
   * List artifacts, optionally filtered by release/product/platform/etc.
   */
  async list(options?: ArtifactFilters): Promise<KeygenListResponse<ReleaseArtifact>> {
    const queryParams = new URLSearchParams();

    if (options?.limit) queryParams.set('limit', options.limit.toString());
    if (options?.release) queryParams.set('release', options.release);
    if (options?.product) queryParams.set('product', options.product);
    if (options?.platform) queryParams.set('platform', options.platform);
    if (options?.arch) queryParams.set('arch', options.arch);
    if (options?.filetype) queryParams.set('filetype', options.filetype);
    if (options?.status) queryParams.set('status', options.status);

    const query = queryParams.toString();
    const endpoint = query ? `/artifacts?${query}` : '/artifacts';

    return this.client.request<ReleaseArtifact[]>(endpoint);
  }

  /**
   * Get an artifact without triggering a download redirect
   * (used for status polling while the upload is being processed)
   */
  async get(artifactId: string): Promise<KeygenResponse<ReleaseArtifact>> {
    const { body } = await this.client.requestWithHeaders<ReleaseArtifact>(
      `/artifacts/${artifactId}`,
      { headers: { Prefer: 'no-download' } }
    );
    return body;
  }

  /**
   * Create an artifact for a release. Returns the artifact plus a presigned
   * storage URL (from the Location header) that the file must be PUT to.
   */
  async create(data: {
    releaseId: string;
    filename: string;
    filesize?: number;
    filetype?: string;
    platform?: string;
    arch?: string;
    checksum?: string;
    signature?: string;
  }): Promise<{ artifact: ReleaseArtifact; uploadUrl: string }> {
    const { releaseId, ...attributes } = data;

    const { body, headers } = await this.client.requestWithHeaders<ReleaseArtifact>('/artifacts', {
      method: 'POST',
      headers: { Prefer: 'no-redirect' },
      body: {
        data: {
          type: 'artifacts',
          attributes,
          relationships: {
            release: {
              data: { type: 'releases', id: releaseId },
            },
          },
        },
      },
    });

    const uploadUrl = headers['location'];
    if (!body.data || !uploadUrl) {
      throw new Error('Artifact created but no upload URL was returned');
    }

    return { artifact: body.data, uploadUrl };
  }

  /**
   * Upload the file directly to storage via the presigned URL,
   * reporting progress. Uses XHR because fetch lacks upload progress.
   */
  uploadFile(
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed — could not reach storage endpoint'));
      xhr.onabort = () => reject(new Error('Upload aborted'));

      xhr.send(file);
    });
  }

  /**
   * Get a presigned download URL for an uploaded artifact
   */
  async getDownloadUrl(artifactId: string, ttl?: number): Promise<string> {
    const endpoint = ttl
      ? `/artifacts/${artifactId}?ttl=${ttl}`
      : `/artifacts/${artifactId}`;

    const { headers } = await this.client.requestWithHeaders<ReleaseArtifact>(endpoint, {
      headers: { Prefer: 'no-redirect' },
    });

    const downloadUrl = headers['location'];
    if (!downloadUrl) {
      throw new Error('No download URL available — the artifact may not be uploaded yet');
    }

    return downloadUrl;
  }

  /**
   * Delete (yank) an artifact
   */
  async delete(artifactId: string): Promise<void> {
    await this.client.request<void>(`/artifacts/${artifactId}`, {
      method: 'DELETE',
    });
  }
}
