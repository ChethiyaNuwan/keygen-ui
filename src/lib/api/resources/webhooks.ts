import { KeygenClient } from '../client';
import { Webhook, WebhookFilters, WebhookEventRecord, PaginationOptions, KeygenResponse, KeygenListResponse } from '../../types/keygen';

// Every event Keygen CE can broadcast, extracted from BroadcastEventService.call
// sites in the keygen-api source (github.com/keygen-sh/keygen-api) — the
// hardcoded ~34-event list here previously covered barely a third of what the
// account can actually emit, so most webhook subscriptions were unavailable
// from the UI. Grouped by resource; alphabetical within each group.
export const WEBHOOK_EVENTS = [
  // account
  'account.updated',
  'account.billing.updated',
  'account.plan.updated',
  'account.settings.created',
  'account.settings.deleted',
  'account.settings.updated',
  'account.subscription.canceled',
  'account.subscription.paused',
  'account.subscription.renewed',
  'account.subscription.resumed',
  // artifact
  'artifact.created',
  'artifact.deleted',
  'artifact.downloaded',
  'artifact.updated',
  'artifact.upload.failed',
  'artifact.upload.processing',
  'artifact.upload.succeeded',
  // component
  'component.created',
  'component.deleted',
  'component.updated',
  // entitlement
  'entitlement.created',
  'entitlement.deleted',
  'entitlement.updated',
  // environment (EE)
  'environment.created',
  'environment.deleted',
  'environment.updated',
  // group
  'group.created',
  'group.deleted',
  'group.owners.attached',
  'group.owners.detached',
  'group.updated',
  // key (pooled licence keys)
  'key.created',
  'key.deleted',
  'key.updated',
  // license
  'license.checked-in',
  'license.checked-out',
  'license.check-in-overdue',
  'license.check-in-required-soon',
  'license.created',
  'license.deleted',
  'license.entitlements.attached',
  'license.entitlements.detached',
  'license.expired',
  'license.expiring-soon',
  'license.group.updated',
  'license.owner.updated',
  'license.policy.updated',
  'license.reinstated',
  'license.renewed',
  'license.revoked',
  'license.suspended',
  'license.updated',
  'license.usage.decremented',
  'license.usage.incremented',
  'license.usage.reset',
  'license.user.updated',
  'license.users.attached',
  'license.users.detached',
  // machine
  'machine.checked-out',
  'machine.created',
  'machine.deleted',
  'machine.group.updated',
  'machine.heartbeat.dead',
  'machine.heartbeat.ping',
  'machine.heartbeat.pong',
  'machine.heartbeat.reset',
  'machine.heartbeat.resurrected',
  'machine.owner.updated',
  'machine.proofs.generated',
  'machine.updated',
  // package (release packages, e.g. npm/pypi/oci)
  'package.created',
  'package.deleted',
  'package.updated',
  // policy
  'policy.created',
  'policy.deleted',
  'policy.entitlements.attached',
  'policy.entitlements.detached',
  'policy.pool.popped',
  'policy.updated',
  // process
  'process.created',
  'process.deleted',
  'process.heartbeat.dead',
  'process.heartbeat.ping',
  'process.heartbeat.pong',
  'process.heartbeat.resurrected',
  'process.updated',
  // product
  'product.created',
  'product.deleted',
  'product.updated',
  // release
  'release.constraints.attached',
  'release.constraints.detached',
  'release.created',
  'release.deleted',
  'release.downloaded',
  'release.package.updated',
  'release.published',
  'release.updated',
  /** Deprecated v1.0 endpoint (see PR notes) — the event can still fire from legacy clients. */
  'release.upgraded',
  'release.uploaded',
  'release.yanked',
  // second factor
  'second-factor.created',
  'second-factor.deleted',
  // token
  'token.generated',
  'token.regenerated',
  'token.revoked',
  // user
  'user.banned',
  'user.created',
  'user.deleted',
  'user.group.updated',
  'user.password-reset',
  'user.unbanned',
  'user.updated',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export class WebhookResource {
  constructor(private client: KeygenClient) {}

  /**
   * List all webhooks
   */
  async list(filters: WebhookFilters = {}): Promise<KeygenListResponse<Webhook>> {
    const params: Record<string, unknown> = {};
    
    // Add pagination
    if (filters.limit) params.limit = filters.limit;
    if (filters.page) params.page = filters.page;
    
    // Add filter parameters
    if (filters.enabled !== undefined) params.enabled = filters.enabled;
    if (filters.url) params.url = filters.url;
    if (filters.subscriptions && filters.subscriptions.length > 0) {
      params.subscriptions = filters.subscriptions.join(',');
    }

    return this.client.request<Webhook[]>('webhook-endpoints', { params });
  }

  /**
   * Get a specific webhook by ID
   */
  async get(id: string): Promise<KeygenResponse<Webhook>> {
    return this.client.request<Webhook>(`webhook-endpoints/${id}`);
  }

  /**
   * Create a new webhook
   */
  async create(webhookData: {
    url: string;
    subscriptions: string[];
    enabled?: boolean;
  }): Promise<KeygenResponse<Webhook>> {
    const body = {
      data: {
        type: 'webhook-endpoints',
        attributes: {
          url: webhookData.url.trim(),
          subscriptions: webhookData.subscriptions,
          enabled: webhookData.enabled !== false, // Default to true
        },
      },
    };

    return this.client.request<Webhook>('webhook-endpoints', {
      method: 'POST',
      body,
    });
  }

  /**
   * Update a webhook
   */
  async update(id: string, updates: {
    url?: string;
    subscriptions?: string[];
    enabled?: boolean;
  }): Promise<KeygenResponse<Webhook>> {
    const body = {
      data: {
        type: 'webhook-endpoints',
        id,
        attributes: {
          ...(updates.url && { url: updates.url.trim() }),
          ...(updates.subscriptions && { subscriptions: updates.subscriptions }),
          ...(updates.enabled !== undefined && { enabled: updates.enabled }),
        },
      },
    };

    return this.client.request<Webhook>(`webhook-endpoints/${id}`, {
      method: 'PATCH',
      body,
    });
  }

  /**
   * Delete a webhook
   */
  async delete(id: string): Promise<void> {
    await this.client.request(`webhook-endpoints/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Enable a webhook
   */
  async enable(id: string): Promise<KeygenResponse<Webhook>> {
    return this.update(id, { enabled: true });
  }

  /**
   * Disable a webhook
   */
  async disable(id: string): Promise<KeygenResponse<Webhook>> {
    return this.update(id, { enabled: false });
  }

  /**
   * Test a webhook by sending a test event
   */
  async test(id: string, eventType = 'webhook.test'): Promise<KeygenResponse<unknown>> {
    const body = {
      data: {
        type: 'webhook-events',
        attributes: {
          event: eventType,
        },
      },
    };

    return this.client.request(`webhook-endpoints/${id}/actions/test`, {
      method: 'POST',
      body,
    });
  }

  /**
   * Get webhook delivery logs
   */
  async getDeliveries(id: string, options: PaginationOptions = {}): Promise<KeygenListResponse<WebhookEventRecord>> {
    const params = this.client.buildPaginationParams(options);
    return this.client.request<WebhookEventRecord[]>(`webhook-endpoints/${id}/webhook-events`, { params });
  }

  /**
   * Get available webhook events
   */
  getAvailableEvents(): string[] {
    return [...WEBHOOK_EVENTS];
  }

  /**
   * Get webhook events grouped by resource
   */
  getEventsByCategory(): Record<string, string[]> {
    const categories: Record<string, string[]> = {};
    
    WEBHOOK_EVENTS.forEach(event => {
      const [resource] = event.split('.');
      if (!categories[resource]) {
        categories[resource] = [];
      }
      categories[resource].push(event);
    });

    return categories;
  }

  /**
   * List delivery attempts across all endpoints.
   */
  async listEvents(options: PaginationOptions = {}): Promise<KeygenListResponse<WebhookEventRecord>> {
    const params = this.client.buildPaginationParams(options);
    return this.client.request<WebhookEventRecord[]>('webhook-events', { params });
  }

  async getEvent(id: string): Promise<KeygenResponse<WebhookEventRecord>> {
    return this.client.request<WebhookEventRecord>(`webhook-events/${id}`);
  }

  /**
   * Re-send a delivery that failed — the usual fix when a customer's endpoint
   * was briefly down.
   */
  async retryEvent(id: string): Promise<KeygenResponse<WebhookEventRecord>> {
    return this.client.request<WebhookEventRecord>(`webhook-events/${id}/actions/retry`, {
      method: 'POST',
    });
  }

  async deleteEvent(id: string): Promise<void> {
    await this.client.request<void>(`webhook-events/${id}`, { method: 'DELETE' });
  }
}
