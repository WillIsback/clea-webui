import type { DashboardStats, DocumentStats, SearchStats, SystemStats } from './types';

import { getApiUrl } from './api';
/**
 * Récupère les statistiques globales pour le dashboard
 * @returns Statistiques complètes de la plateforme CLEA
 */
export async function getDashboardStats(): Promise<DashboardStats> {
	try {
		const response = await fetch(`${getApiUrl()}/stats/dashboard`);

		if (!response.ok) {
			throw new Error(`Erreur ${response.status}: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Erreur lors de la récupération des statistiques:', error);
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
		const response = await fetch(`${getApiUrl()}/stats/documents?skip=${skip}&limit=${limit}`);

		if (!response.ok) {
			throw new Error(`Erreur ${response.status}: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Erreur lors de la récupération des statistiques de documents:', error);
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
		const response = await fetch(`${getApiUrl()}/stats/searches?skip=${skip}&limit=${limit}`);

		if (!response.ok) {
			throw new Error(`Erreur ${response.status}: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Erreur lors de la récupération des statistiques de recherche:', error);
		throw error;
	}
}

/**
 * Récupère les statistiques système
 * @returns Statistiques système
 */
export async function getSystemStats(): Promise<SystemStats> {
	try {
		const response = await fetch(`${getApiUrl()}/stats/system`);

		if (!response.ok) {
			throw new Error(`Erreur ${response.status}: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Erreur lors de la récupération des statistiques système:', error);
		throw error;
	}
}

/**
 * Force le rafraîchissement du cache des statistiques
 * @returns Résultat de l'opération
 */
export async function refreshStatsCache(): Promise<{
	status: string;
	message: string;
	timestamp: string;
}> {
	try {
		const response = await fetch(`${getApiUrl()}/stats/refresh`, {
			method: 'POST'
		});

		if (!response.ok) {
			throw new Error(`Erreur ${response.status}: ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Erreur lors du rafraîchissement des statistiques:', error);
		throw error;
	}
}
