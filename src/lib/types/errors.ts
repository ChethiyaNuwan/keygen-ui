/**
 * Error Types for Keygen UI
 *
 * Real `Error` subclasses (not plain object literals) so `instanceof` works,
 * stack traces are preserved, and `console.error` renders them usefully.
 */

export interface ErrorSource {
  pointer?: string
  parameter?: string
}

export interface KeygenApiErrorDetail {
  id?: string
  status?: string
  code?: string
  title: string
  detail: string
  source?: ErrorSource
  links?: Record<string, string>
}

/** Common base for every error this app throws itself (not third-party/DOM errors). */
export abstract class KeygenClientError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = this.constructor.name
    this.code = code
  }
}

/** Keygen API error (from a JSON:API `errors` response). */
export class KeygenApiError extends KeygenClientError {
  readonly status: number
  readonly title?: string
  readonly detail?: string
  readonly source?: ErrorSource
  readonly errors: KeygenApiErrorDetail[]

  constructor(params: {
    message: string
    status: number
    code?: string
    title?: string
    detail?: string
    source?: ErrorSource
    errors?: KeygenApiErrorDetail[]
  }) {
    super(params.message, params.code)
    this.status = params.status
    this.title = params.title
    this.detail = params.detail
    this.source = params.source
    this.errors = params.errors ?? []
  }
}

/** Network/connection failure — the request never got a response. */
export class NetworkError extends KeygenClientError {
  readonly originalError?: Error

  constructor(
    message: string,
    code: 'NETWORK_ERROR' | 'TIMEOUT' | 'CONNECTION_REFUSED' | 'ABORT',
    originalError?: Error
  ) {
    super(message, code)
    this.originalError = originalError
  }
}

/** 401/403 responses, surfaced distinctly so the auth system can react to them. */
export class AuthError extends KeygenClientError {
  readonly status: 401 | 403

  constructor(
    message: string,
    code: 'AUTH_FAILED' | 'TOKEN_EXPIRED' | 'INVALID_CREDENTIALS' | 'UNAUTHORIZED',
    status: 401 | 403
  ) {
    super(message, code)
    this.status = status
  }
}

/** Client-side validation error (not currently thrown anywhere, kept for forms that want it). */
export class ValidationError extends KeygenClientError {
  readonly field?: string
  readonly value?: unknown

  constructor(message: string, field?: string, value?: unknown) {
    super(message, 'VALIDATION_ERROR')
    this.field = field
    this.value = value
  }
}

/** The response body wasn't valid JSON. */
export class ParseError extends KeygenClientError {
  readonly originalError?: Error

  constructor(message: string, code: 'PARSE_ERROR' | 'JSON_ERROR', originalError?: Error) {
    super(message, code)
    this.originalError = originalError
  }
}

/** Catch-all for anything else the client throws. */
export class AppError extends KeygenClientError {
  readonly originalError?: Error

  constructor(message: string, originalError?: Error) {
    super(message, 'APP_ERROR')
    this.originalError = originalError
    // Preserve the original stack (this constructor's own frame isn't useful
    // for debugging a wrapped error) when we have one to fall back on.
    if (originalError?.stack) {
      this.stack = originalError.stack
    }
  }
}

// HTTP Status Code mappings
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

// Common error codes
export const ERROR_CODES = {
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  ABORT: 'ABORT',

  // Authentication
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Parsing
  PARSE_ERROR: 'PARSE_ERROR',
  JSON_ERROR: 'JSON_ERROR',

  // Application
  APP_ERROR: 'APP_ERROR',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
