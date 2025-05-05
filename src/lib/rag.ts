import type { AskAIRequest } from './types';

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
        const response = await fetch(`${API_BASE_URL}/askai/ask`, {
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
        // Retourner l'objet complet, incluant le contexte
        return {
            response: data.response,
            thinking: data.thinking,
            context: data.context
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
export async function askAIStream(request: AskAIRequest): Promise<{stream: ReadableStream<Uint8Array>, contextPromise: Promise<Record<string, unknown> | null>}> {
    // S'assurer que le mode streaming est activé
    const streamRequest = { ...request, stream: true };
    console.log("askAIStream streamRequest:", streamRequest);
    
    try {
        // Récupérer le contexte dans une requête séparée sans streaming
        // pour avoir accès au contexte même en mode streaming
        const contextPromise = fetch(`${API_BASE_URL}/askai/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({...request, stream: false})
        }).then(res => {
            if (!res.ok) return null;
            return res.json().then(data => data.context);
        }).catch(() => null);
        
        // Faire la requête en streaming pour la génération de réponse
        const response = await fetch(`${API_BASE_URL}/askai/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(streamRequest)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur ${response.status}: ${errorText}`);
        }

        // Vérifier que la réponse est bien un stream
        if (!response.body) {
            throw new Error("La réponse ne contient pas de flux de données");
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
        const response = await fetch(`${API_BASE_URL}/askai/models`);
        
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        // Retourner les noms des modèles avec le préfixe intact
        return data.models || ["Qwen/Qwen3-0.6B"];
    } catch (error) {
        console.error("Erreur lors de la récupération des modèles:", error);
        // Retourner une liste par défaut en cas d'échec
        return ["Qwen/Qwen3-0.6B"];
    }
}