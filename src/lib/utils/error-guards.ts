/**
 * Type Guard Functions for Error Identification
 *
 * client.ts throws real Error subclasses (see @/lib/types/errors), so these
 * are just instanceof checks — kept as functions so call sites don't need to
 * import the classes directly, and so the handful of derived checks
 * (hasHttpStatus, isNotFoundError, etc.) stay in one place.
 */

import {
  KeygenApiError,
  NetworkError,
  AuthError,
  ValidationError,
  ParseError,
  AppError,
  KeygenClientError,
  HTTP_STATUS
} from '@/lib/types/errors'

export function isKeygenApiError(error: unknown): error is KeygenApiError {
  return error instanceof KeygenApiError
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isParseError(error: unknown): error is ParseError {
  return error instanceof ParseError
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Type guard to check if an error is a standard JavaScript Error
 */
export function isJavaScriptError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * Type guard to check if an error has a specific HTTP status
 */
export function hasHttpStatus(error: unknown, status: number): boolean {
  return (isKeygenApiError(error) || isAuthError(error)) && error.status === status
}

/**
 * Type guard to check if an error is a 404 Not Found error
 */
export function isNotFoundError(error: unknown): boolean {
  return hasHttpStatus(error, HTTP_STATUS.NOT_FOUND)
}

/**
 * Type guard to check if an error is a 422 Validation error
 */
export function isUnprocessableEntityError(error: unknown): boolean {
  return hasHttpStatus(error, HTTP_STATUS.UNPROCESSABLE_ENTITY)
}

/**
 * Type guard to check if an error is a 403 Forbidden error
 */
export function isForbiddenError(error: unknown): boolean {
  return hasHttpStatus(error, HTTP_STATUS.FORBIDDEN)
}

/**
 * Type guard to check if an error is a 401 Unauthorized error
 */
export function isUnauthorizedError(error: unknown): boolean {
  return hasHttpStatus(error, HTTP_STATUS.UNAUTHORIZED)
}

/**
 * Extract error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (isKeygenApiError(error)) {
    return error.detail || error.message || 'API Error'
  }

  if (isJavaScriptError(error)) {
    return error.message || 'Unknown Error'
  }

  if (typeof error === 'string') {
    return error
  }

  return 'Unknown Error'
}

/**
 * Extract detailed error messages from Keygen API error response
 * Returns an array of user-friendly error messages
 */
export function getDetailedErrorMessages(error: unknown): string[] {
  if (!isKeygenApiError(error) || error.errors.length === 0) {
    return [getErrorMessage(error)]
  }

  return error.errors.map(err => {
    // Extract the field name from the source pointer (e.g., "/data/attributes/duration" -> "duration")
    let fieldName = ''
    if (err.source?.pointer) {
      const parts = err.source.pointer.split('/')
      fieldName = parts[parts.length - 1]
      // Convert camelCase to readable format
      fieldName = fieldName.replace(/([A-Z])/g, ' $1').toLowerCase().trim()
    }

    // Build a user-friendly message
    if (fieldName && err.detail) {
      // Capitalize first letter of field name
      const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
      return `${capitalizedField}: ${err.detail}`
    }

    return err.detail || err.title || 'Unknown error'
  })
}

/**
 * Get a single combined error message from detailed errors
 */
export function getCombinedErrorMessage(error: unknown): string {
  const messages = getDetailedErrorMessages(error)
  if (messages.length === 1) {
    return messages[0]
  }
  return messages.join('. ')
}

/**
 * Extract error code from any error type
 */
export function getErrorCode(error: unknown): string | undefined {
  return error instanceof KeygenClientError ? error.code : undefined
}

/**
 * Extract HTTP status from any error type
 */
export function getErrorStatus(error: unknown): number | undefined {
  return isKeygenApiError(error) || isAuthError(error) ? error.status : undefined
}

/**
 * Check if error should trigger a retry
 */
export function isRetryableError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return true
  }

  if (isKeygenApiError(error)) {
    // Retry on server errors, timeout, and rate limiting
    return (
      error.status >= 500 ||
      error.status === HTTP_STATUS.TOO_MANY_REQUESTS ||
      error.status === HTTP_STATUS.GATEWAY_TIMEOUT
    )
  }

  return false
}

/**
 * Check if error should show a toast notification
 */
export function shouldShowToast(error: unknown): boolean {
  // Don't show toast for validation errors (handled in forms)
  if (isValidationError(error)) {
    return false
  }

  // Don't show toast for 401 errors (handled by auth system)
  if (isUnauthorizedError(error)) {
    return false
  }

  return true
}
