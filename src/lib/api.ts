import { browser } from '$app/environment';
import { PUBLIC_API_URL } from '$env/static/public';

/**
 * Returns the appropriate API base URL depending on execution context
 * - In browser: returns '/api' (to be handled by nginx proxy)
 * - On server: returns the full API URL from environment variables
 */
export function getApiUrl(): string {
	// In browser: use relative URL that nginx will proxy
	if (browser) {
		return '/api';
	}
	// On server: use internal Docker network URL
	return PUBLIC_API_URL;
}

/**
 * Client API for Cléa
 */
export class ApiClient {
	private baseUrl: string;

	constructor(baseUrl?: string) {
		this.baseUrl = baseUrl || getApiUrl();
	}

	// The rest of your implementation...
}
