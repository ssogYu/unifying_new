/**
 * Core module entry point
 */
// Export HTTP client
export * from './http'

// Re-export for convenience
export { HttpClient, createHttpClient, getDefaultHttpClient } from './http'