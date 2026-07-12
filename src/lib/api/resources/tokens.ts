import { KeygenClient } from '../client';
import { Token, KeygenResponse, KeygenListResponse, ListOptions } from '../../types/keygen';

/**
 * Account-wide API tokens.
 *
 * The secret is only returned when a token is generated or regenerated — it is
 * never readable afterwards, so a lost token has to be regenerated or replaced.
 */
export class TokenResource {
  constructor(private client: KeygenClient) {}

  async list(options: ListOptions = {}): Promise<KeygenListResponse<Token>> {
    const params: Record<string, unknown> = {};
    if (options.limit) params.limit = options.limit;
    if (options.page) params.page = options.page;

    return this.client.request<Token[]>('tokens', { params });
  }

  async get(id: string): Promise<KeygenResponse<Token>> {
    return this.client.request<Token>(`tokens/${id}`);
  }

  /**
   * Issue a new secret for an existing token, invalidating the old one.
   */
  async regenerate(id: string): Promise<KeygenResponse<Token>> {
    return this.client.request<Token>(`tokens/${id}`, { method: 'PUT' });
  }

  /**
   * Revoke a token. Anything still using it stops working immediately.
   */
  async revoke(id: string): Promise<void> {
    await this.client.request<void>(`tokens/${id}`, { method: 'DELETE' });
  }
}
