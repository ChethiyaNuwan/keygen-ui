import { KeygenClient } from '../client';
import {
  Release,
  ReleaseArtifact,
  ReleaseChannel,
  ReleaseStatus,
  ReleaseFilters,
  KeygenResponse,
  KeygenListResponse,
} from '../../types/keygen';

export class ReleaseResource {
  constructor(private client: KeygenClient) {}

  /**
   * List releases, optionally filtered by product, channel or status
   */
  async list(options?: ReleaseFilters): Promise<KeygenListResponse<Release>> {
    const queryParams = new URLSearchParams();

    if (options?.limit) queryParams.set('limit', options.limit.toString());
    if (options?.product) queryParams.set('product', options.product);
    if (options?.channel) queryParams.set('channel', options.channel);
    if (options?.status) queryParams.set('status', options.status);
    if (options?.page?.size) queryParams.set('page[size]', options.page.size.toString());
    if (options?.page?.number) queryParams.set('page[number]', options.page.number.toString());

    const query = queryParams.toString();
    const endpoint = query ? `/releases?${query}` : '/releases';

    return this.client.request<Release[]>(endpoint);
  }

  /**
   * Get a specific release by ID
   */
  async get(releaseId: string): Promise<KeygenResponse<Release>> {
    return this.client.request<Release>(`/releases/${releaseId}`);
  }

  /**
   * Create a new release (as DRAFT unless status given)
   */
  async create(data: {
    productId: string;
    version: string;
    channel: ReleaseChannel;
    name?: string;
    description?: string;
    tag?: string;
    status?: Exclude<ReleaseStatus, 'YANKED'>;
    metadata?: Record<string, unknown>;
  }): Promise<KeygenResponse<Release>> {
    const { productId, ...attributes } = data;

    return this.client.request<Release>('/releases', {
      method: 'POST',
      body: {
        data: {
          type: 'releases',
          attributes,
          relationships: {
            product: {
              data: { type: 'products', id: productId },
            },
          },
        },
      },
    });
  }

  /**
   * Update a release (name, description, tag, metadata)
   */
  async update(releaseId: string, data: {
    name?: string | null;
    description?: string | null;
    tag?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<KeygenResponse<Release>> {
    return this.client.request<Release>(`/releases/${releaseId}`, {
      method: 'PATCH',
      body: {
        data: {
          type: 'releases',
          id: releaseId,
          attributes: data,
        },
      },
    });
  }

  /**
   * Publish a draft release, making it available for download
   */
  async publish(releaseId: string): Promise<KeygenResponse<Release>> {
    return this.client.request<Release>(`/releases/${releaseId}/actions/publish`, {
      method: 'POST',
    });
  }

  /**
   * Yank a published release, revoking download access
   */
  async yank(releaseId: string): Promise<KeygenResponse<Release>> {
    return this.client.request<Release>(`/releases/${releaseId}/actions/yank`, {
      method: 'POST',
    });
  }

  /**
   * Delete a release permanently (artifacts included)
   */
  async delete(releaseId: string): Promise<void> {
    await this.client.request<void>(`/releases/${releaseId}`, {
      method: 'DELETE',
    });
  }

  /**
   * List artifacts belonging to a release
   */
  async listArtifacts(releaseId: string): Promise<KeygenListResponse<ReleaseArtifact>> {
    return this.client.request<ReleaseArtifact[]>(`/releases/${releaseId}/artifacts`);
  }
}
