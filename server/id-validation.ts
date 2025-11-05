/**
 * ID Validation Utilities
 * 
 * Centralized validation functions for URL parameters to prevent:
 * - SQL injection via ID manipulation
 * - Negative or zero ID attacks
 * - Malformed ID strings
 */

/**
 * Validates a numeric ID parameter with strict checks
 * @param param - The URL parameter to validate
 * @param paramName - Name of the parameter for error messages (default: 'ID')
 * @returns Validated numeric ID
 * @throws Error with appropriate HTTP status code details
 */
export function validateNumericId(
  param: string | undefined,
  paramName: string = 'ID'
): number {
  if (!param || typeof param !== 'string') {
    throw new ValidationError(`${paramName} parameter is required`);
  }

  // Trim whitespace
  const trimmed = param.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError(`${paramName} cannot be empty`);
  }

  // Parse as integer with base 10
  const id = parseInt(trimmed, 10);
  
  // Check 1: Must be a valid number
  if (isNaN(id)) {
    throw new ValidationError(`Invalid ${paramName} format: not a number`);
  }
  
  // Check 2: Must be a positive integer
  if (id <= 0) {
    throw new ValidationError(`${paramName} must be a positive integer`);
  }
  
  // Check 3: Must be an integer (not a float)
  if (!Number.isInteger(id)) {
    throw new ValidationError(`${paramName} must be an integer`);
  }
  
  // Check 4: String representation must match exactly
  // This prevents "123abc" from being parsed as 123
  if (id.toString() !== trimmed) {
    throw new ValidationError(`Invalid ${paramName} format: contains non-numeric characters`);
  }
  
  // Check 5: Prevent extremely large numbers (potential DoS)
  if (id > Number.MAX_SAFE_INTEGER) {
    throw new ValidationError(`${paramName} is too large`);
  }

  return id;
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Middleware helper to validate route parameters
 * Returns a standardized error response or the validated ID
 */
export function parseAndValidateId(
  req: { params: { [key: string]: string | undefined } },
  paramName: string = 'id'
): number {
  try {
    return validateNumericId(req.params[paramName], paramName);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Invalid ${paramName}`);
  }
}

