import { KeygenClient } from '../client';
import {
  Policy,
  PooledKey,
  Entitlement,
  KeygenResponse,
  PaginationOptions,
  KeygenListResponse,
  PolicyHeartbeatCullStrategy,
  PolicyHeartbeatResurrectionStrategy,
  PolicyHeartbeatBasis,
  PolicyMachineUniquenessStrategy,
  PolicyMachineMatchingStrategy,
  PolicyExpirationStrategy,
  PolicyExpirationBasis,
  PolicyRenewalBasis,
  PolicyTransferStrategy,
  PolicyAuthenticationStrategy,
  PolicyMachineLeasingStrategy,
  PolicyProcessLeasingStrategy,
  PolicyOverageStrategy,
} from '../../types/keygen';

/** Fields settable on create/update — everything but the product relationship. */
export interface PolicyMutableAttributes {
  name: string;
  duration?: number;
  maxMachines?: number;
  maxProcesses?: number;
  maxCores?: number;
  maxUses?: number;
  strict?: boolean;
  floating?: boolean;
  protected?: boolean;
  requireHeartbeat?: boolean;
  heartbeatDuration?: number;
  heartbeatCullStrategy?: PolicyHeartbeatCullStrategy;
  heartbeatResurrectionStrategy?: PolicyHeartbeatResurrectionStrategy;
  heartbeatBasis?: PolicyHeartbeatBasis;
  machineUniquenessStrategy?: PolicyMachineUniquenessStrategy;
  machineMatchingStrategy?: PolicyMachineMatchingStrategy;
  expirationStrategy?: PolicyExpirationStrategy;
  expirationBasis?: PolicyExpirationBasis;
  renewalBasis?: PolicyRenewalBasis;
  transferStrategy?: PolicyTransferStrategy;
  authenticationStrategy?: PolicyAuthenticationStrategy;
  machineLeasingStrategy?: PolicyMachineLeasingStrategy;
  processLeasingStrategy?: PolicyProcessLeasingStrategy;
  overageStrategy?: PolicyOverageStrategy;
  metadata?: Record<string, unknown>;
}

export class PolicyResource {
  constructor(private client: KeygenClient) {}

  /**
   * List all policies
   */
  async list(options: PaginationOptions = {}): Promise<KeygenListResponse<Policy>> {
    const params = this.client.buildPaginationParams(options);
    return this.client.request<Policy[]>('/policies', { params });
  }

  /**
   * Get a specific policy by ID
   */
  async get(policyId: string): Promise<KeygenResponse<Policy>> {
    return this.client.request<Policy>(`/policies/${policyId}`);
  }

  /**
   * Create a new policy
   */
  async create(data: PolicyMutableAttributes & { productId: string }): Promise<KeygenResponse<Policy>> {
    const { productId, ...attributes } = data;

    return this.client.request<Policy>('/policies', {
      method: 'POST',
      body: {
        data: {
          type: 'policies',
          attributes,
          relationships: {
            product: {
              data: {
                type: 'products',
                id: productId
              }
            }
          }
        }
      }
    });
  }

  /**
   * Update a policy. The product relationship cannot be changed after
   * creation, so it is deliberately not accepted here.
   */
  async update(policyId: string, data: Partial<PolicyMutableAttributes>): Promise<KeygenResponse<Policy>> {
    return this.client.request<Policy>(`/policies/${policyId}`, {
      method: 'PATCH',
      body: {
        data: {
          type: 'policies',
          id: policyId,
          attributes: data
        }
      }
    });
  }

  /**
   * Delete a policy
   */
  async delete(policyId: string): Promise<void> {
    await this.client.request<void>(`/policies/${policyId}`, {
      method: 'DELETE'
    });
  }

  /**
   * List entitlements attached to a policy. Licenses under this policy
   * inherit these automatically, in addition to any attached directly.
   */
  async getEntitlements(policyId: string): Promise<KeygenListResponse<Entitlement>> {
    return this.client.request<Entitlement[]>(`/policies/${policyId}/entitlements`);
  }

  /**
   * Attach entitlements to a policy
   */
  async attachEntitlements(policyId: string, entitlementIds: string[]): Promise<KeygenResponse<unknown>> {
    const body = {
      data: entitlementIds.map(id => ({
        type: 'entitlements',
        id,
      })),
    };

    return this.client.request(`/policies/${policyId}/entitlements`, {
      method: 'POST',
      body,
    });
  }

  /**
   * Detach entitlements from a policy
   */
  async detachEntitlements(policyId: string, entitlementIds: string[]): Promise<void> {
    const body = {
      data: entitlementIds.map(id => ({
        type: 'entitlements',
        id,
      })),
    };

    await this.client.request(`/policies/${policyId}/entitlements`, {
      method: 'DELETE',
      body,
    });
  }

  /**
   * Pooled keys for this policy (only meaningful when the policy uses a pool).
   */
  async listPool(policyId: string): Promise<KeygenListResponse<PooledKey>> {
    return this.client.request<PooledKey[]>(`policies/${policyId}/pool`);
  }

  /**
   * Pop the next key off the pool, removing it.
   */
  async popFromPool(policyId: string): Promise<KeygenResponse<PooledKey>> {
    return this.client.request<PooledKey>(`policies/${policyId}/pool`, {
      method: 'DELETE',
    });
  }
}
