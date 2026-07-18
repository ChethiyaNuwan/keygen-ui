import {
  KeygenResponse,
  // KeygenError removed - using new error types
  ApiRequestOptions,
  PaginationOptions,
} from '@/lib/types/keygen';
import {
  KeygenApiError,
  NetworkError,
  ParseError,
  AuthError,
  AppError,
  KeygenClientError,
  ERROR_CODES,
  HTTP_STATUS
} from '@/lib/types/errors';

// This client throws real Error subclasses (see @/lib/types/errors), not
// plain object literals, so instanceof checks work and stack traces survive.

/**
 * Base64-encode a UTF-8 string in both browser and Node (Buffer isn't
 * available in the browser without a bundler polyfill; btoa alone can't
 * handle non-Latin1 input).
 */
function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export interface KeygenClientConfig {
  apiUrl: string;
  accountId: string;
  token?: string;
  singleplayer?: boolean;
}

export class KeygenClient {
  private config: KeygenClientConfig;

  constructor(config: KeygenClientConfig) {
    this.config = config;
  }

  /**
   * Set the authentication token
   */
  setToken(token: string) {
    this.config.token = token;
  }

  /**
   * Get the current token
   */
  getToken(): string | undefined {
    return this.config.token;
  }

  /**
   * Make an authenticated request to the Keygen API
   */
  async request<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<KeygenResponse<T>> {
    const url = this.buildUrl(endpoint);
    const { method = 'GET', headers = {}, body, params } = options;

    // Build query parameters
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            // Handle nested objects like page[size], date[start], etc.
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              if (nestedValue !== undefined && nestedValue !== null) {
                searchParams.append(`${key}[${nestedKey}]`, String(nestedValue));
              }
            });
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }

    const fullUrl = searchParams.toString() 
      ? `${url}?${searchParams.toString()}`
      : url;

    const requestHeaders: Record<string, string> = {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      ...headers,
    };

    // Add authentication if token is available
    if (this.config.token) {
      requestHeaders.Authorization = `Bearer ${this.config.token}`;
    }

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle JSON responses - try to parse JSON, handle empty responses gracefully
      let data = null;
      
      try {
        data = await response.json();
      } catch (jsonError) {
        // JSON parsing failed
        if (response.ok && method === 'DELETE') {
          // DELETE requests often return empty bodies, which is normal
          data = null;
        } else if (!response.ok) {
          // For error responses, if we can't parse JSON, create a parse error
          throw new ParseError(
            `Failed to parse error response: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`,
            ERROR_CODES.PARSE_ERROR,
            jsonError instanceof Error ? jsonError : undefined
          );
        } else {
          // For other successful responses, log warning but continue
          console.warn('Could not parse JSON response, but request was successful');
          data = null;
        }
      }

      // Handle API errors with proper error types
      if (!response.ok) {
        const message = data?.errors?.[0]?.detail || data?.errors?.[0]?.title || `HTTP ${response.status} Error`;

        // Handle specific auth errors
        if (response.status === HTTP_STATUS.UNAUTHORIZED || response.status === HTTP_STATUS.FORBIDDEN) {
          throw new AuthError(
            message,
            response.status === HTTP_STATUS.UNAUTHORIZED ? ERROR_CODES.UNAUTHORIZED : ERROR_CODES.AUTH_FAILED,
            response.status
          );
        }

        throw new KeygenApiError({
          message,
          status: response.status,
          code: data?.errors?.[0]?.code || `HTTP_${response.status}`,
          title: data?.errors?.[0]?.title || 'API Error',
          detail: data?.errors?.[0]?.detail || `Request failed with status ${response.status}`,
          source: data?.errors?.[0]?.source,
          errors: data?.errors || []
        });
      }

      return data;
    } catch (error) {
      // Re-throw our own error types unchanged
      if (error instanceof KeygenClientError) {
        throw error;
      }

      // Handle network/fetch errors
      if (error instanceof TypeError) {
        throw new NetworkError(error.message || 'Network connection failed', ERROR_CODES.NETWORK_ERROR, error);
      }

      // Handle other JavaScript errors
      if (error instanceof Error) {
        throw new AppError(error.message || 'An unexpected error occurred', error);
      }

      // Fallback for unknown errors
      throw new AppError('An unknown error occurred');
    }
  }

  /**
   * Like request(), but also returns the response headers. Needed for
   * endpoints that communicate via the Location header (artifact upload /
   * download presigned URLs) when called with `Prefer: no-redirect`.
   */
  async requestWithHeaders<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<{ body: KeygenResponse<T>; headers: Record<string, string>; status: number }> {
    const url = this.buildUrl(endpoint);
    const { method = 'GET', headers = {}, body } = options;

    const requestHeaders: Record<string, string> = {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      ...headers,
    };

    if (this.config.token) {
      requestHeaders.Authorization = `Bearer ${this.config.token}`;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });

    let data: KeygenResponse<T> = {};
    try {
      data = await response.json();
    } catch {
      // Some responses (e.g. redirects) have no JSON body
    }

    // 3xx responses are not errors here — they carry the Location header
    if (response.status >= 400) {
      throw new KeygenApiError({
        message: data?.errors?.[0]?.detail || data?.errors?.[0]?.title || `HTTP ${response.status} Error`,
        status: response.status,
        code: data?.errors?.[0]?.code || `HTTP_${response.status}`,
        title: data?.errors?.[0]?.title || 'API Error',
        detail: data?.errors?.[0]?.detail || `Request failed with status ${response.status}`,
        source: data?.errors?.[0]?.source,
        errors: data?.errors || [],
      });
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });

    return { body: data, headers: responseHeaders, status: response.status };
  }

  /**
   * Build the full URL for an endpoint
   * In the browser, routes through /api/keygen proxy to avoid CORS issues
   * In singleplayer CE mode, omits the accounts/{accountId} path segment
   */
  private buildUrl(endpoint: string): string {
    const isBrowser = typeof window !== 'undefined'
    const proxyBase = '/api/keygen'
    const accountPrefix = this.config.singleplayer
      ? ''
      : `/accounts/${this.config.accountId}`

    if (endpoint.startsWith('/')) {
      // Absolute endpoint (e.g., '/tokens', '/me')
      if (endpoint.startsWith('/v1') || endpoint === '/me') {
        // e.g., '/me' → proxy: /api/keygen/me, direct: {apiUrl}/me
        if (isBrowser) {
          // Strip /v1 prefix if present since proxy already targets the API base
          const path = endpoint.startsWith('/v1') ? endpoint.slice(3) : endpoint
          return `${proxyBase}${path}`
        }
        return `${this.config.apiUrl}${endpoint}`
      }
      // e.g., '/tokens' → proxy: /api/keygen/accounts/{id}/tokens
      if (isBrowser) {
        return `${proxyBase}${accountPrefix}${endpoint}`
      }
      return `${this.config.apiUrl}${accountPrefix}${endpoint}`
    }

    // Relative endpoint (e.g., 'licenses')
    if (isBrowser) {
      return accountPrefix
        ? `${proxyBase}${accountPrefix}/${endpoint}`
        : `${proxyBase}/${endpoint}`
    }
    return accountPrefix
      ? `${this.config.apiUrl}${accountPrefix}/${endpoint}`
      : `${this.config.apiUrl}/${endpoint}`
  }

  /**
   * Authenticate with email and password to get a token
   */
  async authenticate(email: string, password: string, tokenName = 'Keygen UI Token'): Promise<string> {
    const credentials = toBase64(`${email}:${password}`);

    const response = await this.request<{ attributes: { token: string } }>('/tokens', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      body: {
        data: {
          type: 'tokens',
          attributes: {
            name: tokenName,
          },
        },
      },
    });

    if (response.data?.attributes?.token) {
      this.setToken(response.data.attributes.token);
      return response.data.attributes.token;
    }

    throw new KeygenApiError({
      message: 'Authentication Failed',
      status: 401,
      title: 'Authentication Failed',
      detail: 'Failed to retrieve token from authentication response',
      code: ERROR_CODES.AUTH_FAILED
    });
  }

  /**
   * Get current user information (Who Am I?)
   */
  async me() {
    return this.request('/me');
  }

  /**
   * Build pagination parameters
   */
  buildPaginationParams(options: PaginationOptions = {}) {
    const params: Record<string, unknown> = {};

    if (options.limit) {
      params.limit = options.limit;
    }

    if (options.page) {
      params.page = options.page;
    }

    return params;
  }
}

// Create a singleton instance
let clientInstance: KeygenClient | null = null;

export function getKeygenClient(): KeygenClient {
  if (!clientInstance) {
    const apiUrl = process.env.NEXT_PUBLIC_KEYGEN_API_URL;
    const accountId = process.env.NEXT_PUBLIC_KEYGEN_ACCOUNT_ID;
    const singleplayer = process.env.NEXT_PUBLIC_KEYGEN_SINGLEPLAYER === 'true';

    if (!apiUrl) {
      throw new Error('Missing required environment variable: NEXT_PUBLIC_KEYGEN_API_URL');
    }

    if (!singleplayer && !accountId) {
      throw new Error('Missing required environment variable: NEXT_PUBLIC_KEYGEN_ACCOUNT_ID (set NEXT_PUBLIC_KEYGEN_SINGLEPLAYER=true for singleplayer CE mode)');
    }

    clientInstance = new KeygenClient({
      apiUrl,
      accountId: accountId || '',
      singleplayer,
    });
  }

  return clientInstance;
}