import { KeygenClient } from '../client';
import { Product, Token, KeygenResponse, ListOptions, KeygenListResponse } from '../../types/keygen';

export class ProductResource {
  constructor(private client: KeygenClient) {}

  /**
   * List all products
   */
  async list(options?: ListOptions): Promise<KeygenListResponse<Product>> {
    const queryParams = new URLSearchParams();
    
    if (options?.limit) queryParams.set('limit', options.limit.toString());
    if (options?.page) queryParams.set('page', options.page.toString());
    
    const query = queryParams.toString();
    const endpoint = query ? `/products?${query}` : '/products';
    
    return this.client.request<Product[]>(endpoint);
  }

  /**
   * Get a specific product by ID
   */
  async get(productId: string): Promise<KeygenResponse<Product>> {
    return this.client.request<Product>(`/products/${productId}`);
  }

  /**
   * Create a new product
   */
  async create(data: {
    name: string;
    code?: string;
    url?: string;
    distributionStrategy?: 'LICENSED' | 'OPEN' | 'CLOSED';
    platforms?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<KeygenResponse<Product>> {
    return this.client.request<Product>('/products', {
      method: 'POST',
      body: {
        data: {
          type: 'products',
          attributes: data
        }
      }
    });
  }

  /**
   * Update a product
   */
  async update(productId: string, data: {
    name?: string;
    code?: string;
    url?: string;
    distributionStrategy?: 'LICENSED' | 'OPEN' | 'CLOSED';
    platforms?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<KeygenResponse<Product>> {
    return this.client.request<Product>(`/products/${productId}`, {
      method: 'PATCH',
      body: {
        data: {
          type: 'products',
          id: productId,
          attributes: data
        }
      }
    });
  }

  /**
   * Delete a product
   */
  async delete(productId: string): Promise<void> {
    await this.client.request<void>(`/products/${productId}`, {
      method: 'DELETE'
    });
  }

  /**
   * List the product's tokens.
   *
   * The token secret itself is only ever returned at creation time, so this
   * shows which tokens exist, not their values.
   */
  async listTokens(productId: string): Promise<KeygenListResponse<Token>> {
    return this.client.request<Token[]>(`/products/${productId}/tokens`);
  }

  /**
   * Mint a product-scoped token.
   *
   * This is what a build pipeline should use to publish releases — it can only
   * act on this product, unlike an admin token.
   *
   * The secret is returned ONCE, in the response; it cannot be read back later.
   */
  async createToken(productId: string, data: {
    name?: string;
    expiry?: string | null;
    permissions?: string[];
  } = {}): Promise<KeygenResponse<Token>> {
    return this.client.request<Token>(`/products/${productId}/tokens`, {
      method: 'POST',
      body: {
        data: {
          type: 'tokens',
          attributes: {
            name: data.name,
            expiry: data.expiry ?? null,
            ...(data.permissions ? { permissions: data.permissions } : {}),
          },
        },
      },
    });
  }
}