/**
 * Safe error logging utility that prevents logging massive objects
 * with circular references (like database connection pools)
 */

export function safeErrorLog(message: string, error: unknown): void {
  let errorDetails: string;
  
  if (error instanceof Error) {
    // Extract safe error information
    errorDetails = error.message || 'Unknown error';
    
    // Include error code if available (useful for database errors)
    if ('code' in error && typeof error.code === 'string') {
      errorDetails += ` [code: ${error.code}]`;
    }
    
    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
      errorDetails += `\n${error.stack.split('\n').slice(0, 5).join('\n')}`;
    }
  } else if (typeof error === 'string') {
    errorDetails = error;
  } else if (error && typeof error === 'object') {
    // Try to extract a message property if it exists
    const errorObj = error as Record<string, unknown>;
    if ('message' in errorObj && typeof errorObj.message === 'string') {
      errorDetails = errorObj.message;
    } else if ('error' in errorObj && typeof errorObj.error === 'string') {
      errorDetails = errorObj.error;
    } else {
      // Last resort: try JSON.stringify with a replacer to avoid circular refs
      try {
        const seen = new WeakSet();
        errorDetails = JSON.stringify(error, (key, value) => {
          // Skip circular references and large objects
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
            
            // Skip large nested objects (like connection pools)
            if (key === '_socket' || key === '_sender' || key === 'config' || 
                key === 'pool' || key === 'connection' || key === '_connection') {
              return '[Object]';
            }
          }
          return value;
        }, 2);
        
        // Truncate if too long
        if (errorDetails.length > 500) {
          errorDetails = errorDetails.substring(0, 500) + '... [truncated]';
        }
      } catch {
        errorDetails = '[Error object - could not serialize]';
      }
    }
  } else {
    errorDetails = String(error);
  }
  
  console.error(`${message}: ${errorDetails}`);
}

