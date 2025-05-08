import type { AskAIRequest } from './types';

import { getApiUrl } from './api';

// Définir une interface pour la réponse complète
interface AskAIResponse {
	response: string;
	thinking?: string;
	context?: Record<string, unknown>;
}

/**
 * Envoie une question au modèle IA et récupère la réponse
 * @param request Les paramètres de la requête
 * @returns La réponse du modèle avec contexte et thinking si disponible
 */
export async function askAI(request: AskAIRequest): Promise<AskAIResponse> {
	try {
		// Récupérer le contexte séparément
		const contextPromise = fetch(`${getApiUrl()}/askai/context`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		})
			.then(async (res) => {
				if (!res.ok) return null;
				const data = await res.json();
				return data.context || null;
			})
			.catch((err) => {
				console.error('Erreur lors de la récupération du contexte:', err);
				return null;
			});

		// Récupérer la réponse principale
		const response = await fetch(`${getApiUrl()}/askai/ask`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => null);
			throw new Error(`Erreur ${response.status}: ${errorData?.detail || response.statusText}`);
		}

		const data = await response.json();

		// Attendre le contexte
		const context = await contextPromise;

		// Retourner l'objet complet, avec le contexte obtenu séparément
		return {
			response: data.response,
			thinking: data.thinking,
			context: context
		};
	} catch (error) {
		console.error("Erreur lors de la communication avec l'API:", error);
		throw error;
	}
}

/**
 * Version streaming de askAI, qui retourne un ReadableStream pour traiter les chunks
 * @param request Les paramètres de la requête (avec stream: true)
 * @returns Un ReadableStream pour traiter les chunks de réponse et le contexte
 */
export async function askAIStream(
	request: AskAIRequest
): Promise<{
	stream: ReadableStream<Uint8Array>;
	contextPromise: Promise<Record<string, unknown> | null>;
}> {
	// S'assurer que le mode streaming est activé
	const streamRequest = { ...request, stream: true };

	try {
		// Utiliser le nouvel endpoint dédié au contexte
		const contextPromise = fetch(`${getApiUrl()}/askai/context`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		})
			.then(async (res) => {
				if (!res.ok) return null;
				const data = await res.json();
				return data.context || null;
			})
			.catch((err) => {
				console.error('Erreur lors de la récupération du contexte:', err);
				return null;
			});

		// Requête en streaming pour la réponse
		const response = await fetch(`${getApiUrl()}/askai/ask`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(streamRequest)
		});

		// Reste du code inchangé...
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Erreur ${response.status}: ${errorText}`);
		}

		if (!response.body) {
			throw new Error('La réponse ne contient pas de flux de données');
		}

		return {
			stream: response.body,
			contextPromise
		};
	} catch (error) {
		console.error("Erreur lors de la communication avec l'API en mode streaming:", error);
		throw error;
	}
}
/**
 * Récupère la liste des modèles disponibles
 * @returns Liste des modèles disponibles
 */
export async function getAvailableModels(): Promise<string[]> {
	try {
		const response = await fetch(`${getApiUrl()}/askai/models`);

		if (!response.ok) {
			throw new Error(`Erreur ${response.status}: ${response.statusText}`);
		}
		const data = await response.json();
		// Retourner les noms des modèles avec le préfixe intact
		return data.models;
	} catch (error) {
		console.error('Erreur lors de la récupération des modèles:', error);
		// Retourner une liste par défaut en cas d'échec
		return ['Qwen3-0.6B'];
	}
}
