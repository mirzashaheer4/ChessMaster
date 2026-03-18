/**
 * Centralized URL utility for server communication
 * Handles URL cleanup (trailing slash removal) and defaults
 */

export function getServerUrl(envUrl?: string, defaultUrl = 'http://localhost:3001'): string {
  const rawUrl = envUrl || defaultUrl;
  // Remove trailing slash for consistent URL format
  return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

/**
 * Get and validate API server URL from environment or default
 * Usage: const apiUrl = getApiServerUrl(import.meta.env.VITE_SERVER_URL)
 */
export function getApiServerUrl(): string {
  return getServerUrl(import.meta.env.VITE_SERVER_URL as string);
}
