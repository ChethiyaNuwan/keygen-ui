import { KeygenClient } from '../client';
import { ReleasePackage, ReleaseEngineKey, PaginationOptions, KeygenResponse, KeygenListResponse } from '@/lib/types/keygen';

export interface PackageFilters extends PaginationOptions {
  product?: string;
  engine?: ReleaseEngineKey;
}

export class PackageResource {
  constructor(private client: KeygenClient) {}

  /**
   * List release packages (the npm/pypi/tauri/oci/rubygems/raw distribution
   * engine config for a product's releases).
   */
  async list(filters: PackageFilters = {}): Promise<KeygenListResponse<ReleasePackage>> {
    const params = this.client.buildPaginationParams(filters);

    if (filters.product) params.product = filters.product;
    if (filters.engine) params.engine = filters.engine;

    return this.client.request<ReleasePackage[]>('packages', { params });
  }

  /**
   * Get a specific package by ID (or its `key` alias)
   */
  async get(id: string): Promise<KeygenResponse<ReleasePackage>> {
    return this.client.request<ReleasePackage>(`packages/${id}`);
  }

  /**
   * Create a new release package
   */
  async create(data: {
    productId: string;
    name?: string;
    key: string;
    engine?: ReleaseEngineKey;
    metadata?: Record<string, unknown>;
  }): Promise<KeygenResponse<ReleasePackage>> {
    const { productId, ...attributes } = data;

    return this.client.request<ReleasePackage>('packages', {
      method: 'POST',
      body: {
        data: {
          type: 'packages',
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
   * Update a release package
   */
  async update(id: string, updates: {
    name?: string;
    key?: string;
    engine?: ReleaseEngineKey;
    metadata?: Record<string, unknown>;
  }): Promise<KeygenResponse<ReleasePackage>> {
    return this.client.request<ReleasePackage>(`packages/${id}`, {
      method: 'PATCH',
      body: {
        data: {
          type: 'packages',
          id,
          attributes: updates,
        },
      },
    });
  }

  /**
   * Delete a release package
   */
  async delete(id: string): Promise<void> {
    await this.client.request(`packages/${id}`, {
      method: 'DELETE',
    });
  }
}
