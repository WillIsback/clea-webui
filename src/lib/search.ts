import type { SearchRequest, SearchResponse } from "./types";

let API_BASE_URL = 'http://localhost:8080';

// Utilisation d'un try-catch pour gérer les imports conditionnels
try {
    const { PUBLIC_API_URL } = await import('$env/static/public');
    if (PUBLIC_API_URL) {
        API_BASE_URL = PUBLIC_API_URL;
    }
} catch (e) {
    console.warn('PUBLIC_API_URL non disponible, utilisation de l\'URL par défaut', e);
}


// Fonction pour effectuer une recherche
export async function searchDocuments(request: SearchRequest): Promise<SearchResponse> {
    const response = await fetch(`${API_BASE_URL}/search/hybrid_search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        throw new Error(`Erreur lors de la recherche : ${response.statusText}`);
    }
    return response.json();
}