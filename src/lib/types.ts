// Interface pour représenter un document
export interface Document {
	id: number;
	title: string;
	theme: string;
	documentType: string;
	publishDate: string;
	corpusId?: string;
	chunkCount: number;
	indexNeeded: boolean;
}

// Interface pour ajouter un document
export interface DocumentCreate {
	title: string;
	theme: string;
	documentType: string;
	publishDate: string;
	corpusId?: string;
}

// Interface pour créer un chunk
export interface ChunkCreate {
	id?: number;
	content: string;
	hierarchyLevel?: 0 | 1 | 2 | 3;
	start_char?: number;
	end_char?: number;
	parent_id?: string | null;
}

// Interface pour représenter un document avec ses chunks
export interface DocumentOut {
	id: number;
	title: string;
	theme: string;
	documentType: string;
	publishDate: string;
	corpusId: string;
	chunkCount: number;
	indexNeeded?: boolean;
	indexMessage?: string;
}

// Interface pour mettre à jour un document
export interface DocumentUpdate {
	id: number;
	title?: string;
	theme?: string;
	documentType?: string;
	publishDate?: string;
	corpusId?: string;
}

// Interface pour mise à jour avec ajout de chunks
export interface UpdateWithChunks {
	document: DocumentUpdate;
	newChunks?: ChunkCreate[];
}

// Contexte hiérarchique pour un résultat de recherche
export interface HierarchicalContext {
	level0?: Record<string, unknown>;
	level1?: Record<string, unknown>;
	level2?: Record<string, unknown>;
}

// Interface pour une requête de recherche
export interface SearchRequest {
	query: string;
	topK: number;
	theme?: string;
	documentType?: string;
	startDate?: string;
	endDate?: string;
	corpusId?: string;
	hierarchical: boolean;
	hierarchyLevel?: number;
	filterByRelevance?: boolean;
	normalizeScores?: boolean;
}

// Interface pour les résultats de recherche
export interface SearchResponse {
	query: string;
	topK: number;
	totalResults: number;
	results: ChunkResult[];
	confidence?: ConfidenceMetrics;
	normalized: boolean;
	message?: string;
}

// Interface pour les métriques de confiance
export interface ConfidenceMetrics {
	level: number;
	message: string;
	stats: {
		min?: number;
		max?: number;
		avg?: number;
		median?: number;
		[key: string]: number | undefined;
	};
}

// Interface pour un chunk résultat de recherche
export interface ChunkResult {
	chunkId: number;
	documentId: number;
	title: string;
	content: string;
	theme: string;
	documentType: string;
	publishDate: string;
	score: number;
	hierarchyLevel: number;
	context?: HierarchicalContext;
}

export interface IndexStatus {
	corpusId: string;
	indexExists: boolean;
	configExists: boolean;
	isIndexed: boolean;
	indexType: string | null;
	chunkCount: number;
	indexedChunks: number;
	lastIndexed: string | null;
}

// Interfaces pour les statistiques
export interface DashboardStats {
	documentStats: DocumentStats;
	searchStats: SearchStats;
	systemStats: SystemStats;
}

export interface DocumentStats {
	totalCount: number;
	byTheme: Record<string, number>;
	byType: Record<string, number>;
	recentlyAdded: number; // Derniers 30 jours
	percentChange: number; // Évolution en pourcentage
}

export interface SearchStats {
	totalCount: number;
	lastMonthCount: number;
	percentChange: number; // Évolution en pourcentage
	topQueries: Array<{ query: string; count: number }>; // Requêtes populaires
}

export interface SystemStats {
	satisfaction: number; // Pourcentage de satisfaction
	avgConfidence: number; // Confiance moyenne des recherches
	percentChange: number; // Évolution en pourcentage
	indexedCorpora: number; // Nombre de corpus indexés
	totalCorpora: number; // Nombre total de corpus
}

// Interface pour le rag askai
export interface AskAIRequest {
	query: string;
	filters?: {
		theme?: string;
		documentType?: string;
		startDate?: string;
		endDate?: string;
		corpusId?: string;
		hierarchical?: boolean;
		hierarchyLevel?: number;
	};
	modelName?: string;
	stream?: boolean;
	promptType?: 'standard' | 'summary' | 'comparison';
	enableThinking?: boolean;
}
