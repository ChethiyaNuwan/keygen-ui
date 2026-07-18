import { KeygenClient } from '../client';
import { Entitlement, KeygenResponse, PaginationOptions, KeygenListResponse } from '../../types/keygen';

export interface EntitlementFilters extends PaginationOptions {
  name?: string;
  code?: string;
}

export class EntitlementResource {
  constructor(private client: KeygenClient) {}

  /**
   * List all entitlements
   */
  async list(filters: EntitlementFilters = {}): Promise<KeygenListResponse<Entitlement>> {
    const params: Record<string, unknown> = {};
    
    // Add pagination
    if (filters.limit) params.limit = filters.limit;
    if (filters.page) params.page = filters.page;
    
    // Add filter parameters
    if (filters.name) params.name = filters.name;
    if (filters.code) params.code = filters.code;

    return this.client.request<Entitlement[]>('entitlements', { params });
  }

  /**
   * Get a specific entitlement by ID
   */
  async get(id: string): Promise<KeygenResponse<Entitlement>> {
    return this.client.request<Entitlement>(`entitlements/${id}`);
  }

  /**
   * Create a new entitlement
   */
  async create(entitlementData: {
    name: string;
    code: string;
  }): Promise<KeygenResponse<Entitlement>> {
    const body = {
      data: {
        type: 'entitlements',
        attributes: {
          name: entitlementData.name.trim(),
          code: entitlementData.code.trim(),
        },
      },
    };

    return this.client.request<Entitlement>('entitlements', {
      method: 'POST',
      body,
    });
  }

  /**
   * Update an entitlement
   */
  async update(id: string, updates: {
    name?: string;
    code?: string;
  }): Promise<KeygenResponse<Entitlement>> {
    const body = {
      data: {
        type: 'entitlements',
        id,
        attributes: {
          ...(updates.name && { name: updates.name.trim() }),
          ...(updates.code && { code: updates.code.trim() }),
        },
      },
    };

    return this.client.request<Entitlement>(`entitlements/${id}`, {
      method: 'PATCH',
      body,
    });
  }

  /**
   * Delete an entitlement
   */
  async delete(id: string): Promise<void> {
    await this.client.request(`entitlements/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * NOTE: entitlements are attached from the other side — Keygen mounts
   * /entitlements as a flat resource with no sub-routes:
   *
   *   licenses.attachEntitlements(licenseId, [entitlementId])
   *   policies.attachEntitlements(policyId, [entitlementId])
   *
   * There is likewise no way to list the licences carrying an entitlement:
   * /licenses has no entitlement filter.
   */
}
