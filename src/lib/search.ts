import type { SearchRequest, SearchResponse } from './types';

import { getApiUrl } from './api';

// Fonction pour effectuer une recherche
export async function searchDocuments(request: SearchRequest): Promise<SearchResponse> {
	const response = await fetch(`${getApiUrl()}/search/hybrid_search`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request)
	});
	if (!response.ok) {
		throw new Error(`Erreur lors de la recherche : ${response.statusText}`);
	}
	return response.json();
}
