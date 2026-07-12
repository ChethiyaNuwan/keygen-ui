import { KeygenClient } from '../client';
import { Group, User, KeygenResponse, ListOptions, KeygenListResponse } from '../../types/keygen';

export interface GroupFilters extends ListOptions {
  name?: string;
  maxLicenses?: number;
  maxMachines?: number;
  maxUsers?: number;
}

export class GroupResource {
  constructor(private client: KeygenClient) {}

  /**
   * List all groups
   */
  async list(filters: GroupFilters = {}): Promise<KeygenListResponse<Group>> {
    const params: Record<string, unknown> = {};
    
    // Add pagination
    if (filters.limit) params.limit = filters.limit;
    if (filters.page) params.page = filters.page;
    
    // Add filter parameters
    if (filters.name) params.name = filters.name;
    if (filters.maxLicenses) params.maxLicenses = filters.maxLicenses;
    if (filters.maxMachines) params.maxMachines = filters.maxMachines;
    if (filters.maxUsers) params.maxUsers = filters.maxUsers;

    return this.client.request<Group[]>('groups', { params });
  }

  /**
   * Get a specific group by ID
   */
  async get(id: string): Promise<KeygenResponse<Group>> {
    return this.client.request<Group>(`groups/${id}`);
  }

  /**
   * Create a new group
   */
  async create(groupData: {
    name: string;
    maxLicenses?: number;
    maxMachines?: number;
    maxUsers?: number;
  }): Promise<KeygenResponse<Group>> {
    const body = {
      data: {
        type: 'groups',
        attributes: {
          name: groupData.name.trim(),
          ...(groupData.maxLicenses && { maxLicenses: groupData.maxLicenses }),
          ...(groupData.maxMachines && { maxMachines: groupData.maxMachines }),
          ...(groupData.maxUsers && { maxUsers: groupData.maxUsers }),
        },
      },
    };

    return this.client.request<Group>('groups', {
      method: 'POST',
      body,
    });
  }

  /**
   * Update a group
   */
  async update(id: string, updates: {
    name?: string;
    maxLicenses?: number;
    maxMachines?: number;
    maxUsers?: number;
  }): Promise<KeygenResponse<Group>> {
    const body = {
      data: {
        type: 'groups',
        id,
        attributes: {
          ...(updates.name && { name: updates.name.trim() }),
          ...(updates.maxLicenses !== undefined && { maxLicenses: updates.maxLicenses }),
          ...(updates.maxMachines !== undefined && { maxMachines: updates.maxMachines }),
          ...(updates.maxUsers !== undefined && { maxUsers: updates.maxUsers }),
        },
      },
    };

    return this.client.request<Group>(`groups/${id}`, {
      method: 'PATCH',
      body,
    });
  }

  /**
   * Delete a group
   */
  async delete(id: string): Promise<void> {
    await this.client.request(`groups/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get group licenses
   */
  async getLicenses(id: string, options: ListOptions = {}): Promise<KeygenResponse<unknown[]>> {
    const params: Record<string, unknown> = {};
    if (options.limit) params.limit = options.limit;
    if (options.page) params.page = options.page;

    return this.client.request(`groups/${id}/licenses`, { params });
  }

  /**
   * Get group users
   */
  async getUsers(id: string, options: ListOptions = {}): Promise<KeygenResponse<unknown[]>> {
    const params: Record<string, unknown> = {};
    if (options.limit) params.limit = options.limit;
    if (options.page) params.page = options.page;

    return this.client.request(`groups/${id}/users`, { params });
  }

  /**
   * Add user to group
   */
  async addUser(id: string, userId: string): Promise<KeygenResponse<unknown>> {
    // Group membership is written on the member, not the group: Keygen exposes
    // no attach endpoint under /groups/:id/users (only index/show).
    return this.client.request(`users/${userId}/group`, {
      method: 'PUT',
      body: { data: { type: 'groups', id } },
    });
  }

  /**
   * Remove user from group
   */
  async removeUser(id: string, userId: string): Promise<KeygenResponse<unknown>> {
    void id;
    // Clearing the member's group is how it leaves one.
    return this.client.request(`users/${userId}/group`, {
      method: 'PUT',
      body: { data: null },
    });
  }

  /**
   * Add license to group
   */
  async addLicense(id: string, licenseId: string): Promise<KeygenResponse<unknown>> {
    return this.client.request(`licenses/${licenseId}/group`, {
      method: 'PUT',
      body: { data: { type: 'groups', id } },
    });
  }

  /**
   * Remove license from group
   */
  async removeLicense(id: string, licenseId: string): Promise<KeygenResponse<unknown>> {
    void id;
    return this.client.request(`licenses/${licenseId}/group`, {
      method: 'PUT',
      body: { data: null },
    });
  }

  /**
   * Group owners — users who can administer the group.
   */
  async listOwners(id: string): Promise<KeygenListResponse<User>> {
    return this.client.request<User[]>(`groups/${id}/owners`);
  }

  async attachOwners(id: string, userIds: string[]): Promise<KeygenResponse<unknown>> {
    return this.client.request(`groups/${id}/owners`, {
      method: 'POST',
      body: { data: userIds.map(userId => ({ type: 'users', id: userId })) },
    });
  }

  async detachOwners(id: string, userIds: string[]): Promise<void> {
    await this.client.request(`groups/${id}/owners`, {
      method: 'DELETE',
      body: { data: userIds.map(userId => ({ type: 'users', id: userId })) },
    });
  }
}
