import type { DashboardStats, DocumentStats, SearchStats, SystemStats } from "./types";

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


/**
 * Récupère les statistiques globales pour le dashboard
 * @returns Statistiques complètes de la plateforme CLEA
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        const response = await fetch(`${API_BASE_URL}/stats/dashboard`);
        
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
        throw error; // On propage l'erreur pour la gérer dans le composant
    }
}

/**
 * Récupère les statistiques détaillées sur les documents
 * @param skip Nombre d'éléments à ignorer
 * @param limit Nombre maximal d'éléments à retourner
 * @returns Statistiques détaillées sur les documents
 */
export async function getDocumentStats(skip = 0, limit = 100): Promise<DocumentStats> {
    try {
        const response = await fetch(`${API_BASE_URL}/stats/documents?skip=${skip}&limit=${limit}`);
        
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Erreur lors de la récupération des statistiques de documents:", error);
        throw error;
    }
}

/**
 * Récupère les statistiques sur la recherche
 * @param skip Nombre d'éléments à ignorer
 * @param limit Nombre maximal d'éléments à retourner
 * @returns Statistiques sur les recherches
 */
export async function getSearchStats(skip = 0, limit = 100): Promise<SearchStats> {
    try {
        const response = await fetch(`${API_BASE_URL}/stats/searches?skip=${skip}&limit=${limit}`);
        
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Erreur lors de la récupération des statistiques de recherche:", error);
        throw error;
    }
}

/**
 * Récupère les statistiques système
 * @returns Statistiques système
 */
export async function getSystemStats(): Promise<SystemStats> {
    try {
        const response = await fetch(`${API_BASE_URL}/stats/system`);
        
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Erreur lors de la récupération des statistiques système:", error);
        throw error;
    }
}

/**
 * Force le rafraîchissement du cache des statistiques
 * @returns Résultat de l'opération
 */
export async function refreshStatsCache(): Promise<{status: string, message: string, timestamp: string}> {
    try {
        const response = await fetch(`${API_BASE_URL}/stats/refresh`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Erreur lors du rafraîchissement des statistiques:", error);
        throw error;
    }
}