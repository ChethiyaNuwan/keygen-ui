import { KeygenClient } from '../client';
import {
  Release,
  ReleaseArtifact,
  ReleaseChannel,
  ReleaseStatus,
  ReleaseFilters,
  Constraint,
  KeygenResponse,
  KeygenListResponse,
} from '../../types/keygen';

export class ReleaseResource {
  constructor(private client: KeygenClient) {}

  /**
   * List releases, optionally filtered by product, channel or status
   */
  async list(options: ReleaseFilters = {}): Promise<KeygenListResponse<Release>> {
    const params = {
      ...this.client.buildPaginationParams(options),
    };

    if (options.product) params.product = options.product;
    if (options.channel) params.channel = options.channel;
    if (options.status) params.status = options.status;

    return this.client.request<Release[]>('/releases', { params });
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

  /**
   * List entitlement constraints gating this release. A release with any
   * constraints attached can only be downloaded by a license entitled to
   * every one of them (strict match).
   */
  async listConstraints(releaseId: string): Promise<KeygenListResponse<Constraint>> {
    return this.client.request<Constraint[]>(`/releases/${releaseId}/constraints`);
  }

  /**
   * Attach entitlement constraints to a release
   */
  async attachConstraints(releaseId: string, entitlementIds: string[]): Promise<KeygenListResponse<Constraint>> {
    const body = {
      data: entitlementIds.map(id => ({
        type: 'constraints',
        relationships: {
          entitlement: {
            data: { type: 'entitlements', id },
          },
        },
      })),
    };

    return this.client.request<Constraint[]>(`/releases/${releaseId}/constraints`, {
      method: 'POST',
      body,
    });
  }

  /**
   * Detach entitlement constraints from a release. Takes constraint IDs
   * (from `listConstraints`), not entitlement IDs.
   */
  async detachConstraints(releaseId: string, constraintIds: string[]): Promise<void> {
    const body = {
      data: constraintIds.map(id => ({
        type: 'constraints',
        id,
      })),
    };

    await this.client.request(`/releases/${releaseId}/constraints`, {
      method: 'DELETE',
      body,
    });
  }
}
