import { KeygenClient } from '../client';
import { Machine, MachineFilters, MachineFile, Process, Component, KeygenResponse, KeygenListResponse } from '@/lib/types/keygen';
import { setGroup } from './relationships';

export class MachineResource {
  constructor(private client: KeygenClient) {}

  /**
   * List all machines
   */
  async list(filters: MachineFilters = {}): Promise<KeygenListResponse<Machine>> {
    const params = {
      ...this.client.buildPaginationParams(filters),
    };

    // Add filter parameters
    if (filters.license) params.license = filters.license;
    if (filters.user) params.user = filters.user;
    if (filters.group) params.group = filters.group;
    if (filters.product) params.product = filters.product;
    if (filters.policy) params.policy = filters.policy;
    if (filters.fingerprint) params.fingerprint = filters.fingerprint;
    if (filters.ip) params.ip = filters.ip;

    return this.client.request<Machine[]>('machines', { params });
  }

  /**
   * Get a specific machine by ID
   */
  async get(id: string): Promise<KeygenResponse<Machine>> {
    return this.client.request<Machine>(`machines/${id}`);
  }

  /**
   * Activate a machine (create)
   */
  async activate(machineData: {
    fingerprint: string;
    licenseId: string;
    name?: string;
    platform?: string;
    hostname?: string;
    cores?: number;
    ip?: string;
  }): Promise<KeygenResponse<Machine>> {
    const body = {
      data: {
        type: 'machines',
        attributes: {
          fingerprint: machineData.fingerprint,
          name: machineData.name,
          platform: machineData.platform,
          hostname: machineData.hostname,
          cores: machineData.cores,
          ip: machineData.ip,
        },
        relationships: {
          license: {
            data: { type: 'licenses', id: machineData.licenseId },
          },
        },
      },
    };

    return this.client.request<Machine>('machines', {
      method: 'POST',
      body,
    });
  }

  /**
   * Update a machine
   */
  async update(id: string, updates: {
    name?: string;
    platform?: string;
    hostname?: string;
    cores?: number;
    requireHeartbeat?: boolean;
    heartbeatDuration?: number;
  }): Promise<KeygenResponse<Machine>> {
    const body = {
      data: {
        type: 'machines',
        id,
        attributes: updates,
      },
    };

    return this.client.request<Machine>(`machines/${id}`, {
      method: 'PATCH',
      body,
    });
  }

  /**
   * Deactivate a machine (delete)
   */
  async deactivate(id: string): Promise<void> {
    await this.client.request(`machines/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Check out a machine file: a signed snapshot the client verifies offline,
   * mirroring licenses.checkOut. `ttl` (seconds) is how long it stays valid
   * without contacting the server.
   */
  async checkOut(id: string, options: {
    ttl?: number;
    include?: string[];
    encrypt?: boolean;
  } = {}): Promise<KeygenResponse<MachineFile>> {
    return this.client.request<MachineFile>(`machines/${id}/actions/check-out`, {
      method: 'POST',
      body: {
        meta: {
          ...(options.ttl !== undefined && { ttl: options.ttl }),
          ...(options.include && { include: options.include }),
          ...(options.encrypt !== undefined && { encrypt: options.encrypt }),
        },
      },
    });
  }

  /**
   * Ping machine heartbeat
   */
  async ping(id: string): Promise<KeygenResponse<Machine>> {
    return this.client.request<Machine>(`machines/${id}/actions/ping`, {
      method: 'POST',
    });
  }

  /**
   * Reset machine heartbeat
   */
  async resetHeartbeat(id: string): Promise<KeygenResponse<Machine>> {
    return this.client.request<Machine>(`machines/${id}/actions/reset`, {
      method: 'POST',
    });
  }

  /**
   * Get machine processes
   */
  async getProcesses(id: string): Promise<KeygenListResponse<Process>> {
    return this.client.request<Process[]>(`machines/${id}/processes`);
  }

  /**
   * Get machine components
   */
  async getComponents(id: string): Promise<KeygenListResponse<Component>> {
    return this.client.request<Component[]>(`machines/${id}/components`);
  }

  /**
   * Change machine owner
   */
  async changeOwner(id: string, userId: string): Promise<KeygenResponse<Machine>> {
    const body = {
      data: { type: 'users', id: userId },
    };

    return this.client.request<Machine>(`machines/${id}/owner`, {
      method: 'PUT',
      body,
    });
  }

  /**
   * Change machine group. Pass `null` to remove the machine from its group.
   */
  async changeGroup(id: string, groupId: string | null): Promise<KeygenResponse<Machine>> {
    return setGroup<Machine>(this.client, `machines/${id}`, groupId);
  }
}