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

export { API_BASE_URL };

// Types pour les réponses d'API
export interface IndexCreationResponse {
    status: string;
    message: string;
    index_type?: string;
    lists?: number;
    documents_updated?: number;
    view_name?: string;
}

export interface IndexDeletionResponse {
    status: string;
    message: string;
}

export interface IndexStatus {
    corpus_id: string;
    index_exists: boolean;
    config_exists: boolean;
    is_indexed: boolean;
    index_type: string | null;
    chunk_count: number;
    indexed_chunks: number;
    last_indexed: string | null;
    status?: string;
    message?: string;
}

export interface AllIndexesResponse {
    status: string;
    corpus_count?: number;
    indexes?: IndexStatus[];
    message?: string;
}

/**
 * Crée un index vectoriel pour un corpus spécifique
 * @param corpusId Identifiant UUID du corpus à indexer
 * @returns Résultat de l'opération avec statut et message
 */
export async function createCorpusIndex(corpusId: string): Promise<IndexCreationResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/index/create-index/${corpusId}`, {
            method: "POST",
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erreur ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error: unknown) {
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Une erreur inconnue est survenue lors de la création de l'index",
        };
    }
}

/**
 * Supprime l'index vectoriel d'un corpus spécifique
 * @param corpusId Identifiant UUID du corpus
 * @returns Résultat de l'opération
 */
export async function dropCorpusIndex(corpusId: string): Promise<IndexDeletionResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/index/drop-index/${corpusId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erreur ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error: unknown) {
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Une erreur inconnue est survenue lors de la suppression de l'index",
        };
    }
}

/**
 * Vérifie l'état de l'index pour un corpus spécifique
 * @param corpusId Identifiant UUID du corpus
 * @returns État de l'index et métadonnées
 */
export async function getIndexStatus(corpusId: string): Promise<IndexStatus> {
    try {
        const response = await fetch(`${API_BASE_URL}/index/index-status/${corpusId}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erreur ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error: unknown) {
        return {
            corpus_id: corpusId,
            index_exists: false,
            config_exists: false,
            is_indexed: false,
            index_type: null,
            chunk_count: 0,
            indexed_chunks: 0,
            last_indexed: null,
            status: "error",
            message: error instanceof Error ? error.message : "Une erreur est survenue lors de la vérification de l'index",
        };
    }
}

/**
 * Vérifie l'état de tous les index vectoriels
 * @returns État des index pour tous les corpus
 */
export async function getAllIndexes(): Promise<AllIndexesResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/index/indexes`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erreur ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error: unknown) {
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Une erreur est survenue lors de la récupération des index",
        };
    }
}


// Nouvelle interface pour la réponse du nettoyage d'index
export interface CleanupIndexesResponse {
    status: string;
    message?: string;
    removed_indexes?: number;
    removed_configs?: number;
    removed_views?: number;
}

/**
 * Nettoie les index vectoriels orphelins
 * @returns Résultat de l'opération avec statistiques
 */
export async function cleanupOrphanedIndexes(): Promise<CleanupIndexesResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/index/cleanup-indexes`, {
            method: "POST",
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Erreur ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error: unknown) {
        return {
            status: "error",
            message: error instanceof Error ? error.message : "Une erreur est survenue lors du nettoyage des index orphelins",
        };
    }
}