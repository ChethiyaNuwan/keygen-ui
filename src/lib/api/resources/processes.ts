import { KeygenClient } from '../client';
import { Process, PaginationOptions, KeygenResponse, KeygenListResponse } from '@/lib/types/keygen';

export interface ProcessFilters extends PaginationOptions {
  product?: string;
  machine?: string;
  license?: string;
  owner?: string;
  user?: string;
  /** Server-side heartbeat scope — verified against MachineProcess#with_status. */
  status?: 'ALIVE' | 'DEAD';
}

export class ProcessResource {
  constructor(private client: KeygenClient) {}

  /**
   * List monitored processes across all machines. Prefer
   * `machines.getProcesses(machineId)` when you already have a machine in
   * hand — this is for account-wide listing/filtering.
   */
  async list(filters: ProcessFilters = {}): Promise<KeygenListResponse<Process>> {
    const params = this.client.buildPaginationParams(filters);

    if (filters.product) params.product = filters.product;
    if (filters.machine) params.machine = filters.machine;
    if (filters.license) params.license = filters.license;
    if (filters.owner) params.owner = filters.owner;
    if (filters.user) params.user = filters.user;
    if (filters.status) params.status = filters.status;

    return this.client.request<Process[]>('processes', { params });
  }

  /**
   * Get a specific process by ID
   */
  async get(id: string): Promise<KeygenResponse<Process>> {
    return this.client.request<Process>(`processes/${id}`);
  }

  /**
   * Kill a monitored process
   */
  async kill(id: string): Promise<void> {
    await this.client.request(`processes/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Ping a process's heartbeat, keeping it ALIVE
   */
  async ping(id: string): Promise<KeygenResponse<Process>> {
    return this.client.request<Process>(`processes/${id}/actions/ping`, {
      method: 'POST',
    });
  }
}
