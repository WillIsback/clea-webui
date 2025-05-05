<script lang="ts">
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { searchDocuments } from "$lib/search";
    import { goto } from '$app/navigation';
    import type { SearchRequest, SearchResponse, ChunkResult, ConfidenceMetrics } from "$lib/types";

    // Variables pour rechercher des documents
    let query = $state("");
    let topK = $state(10);
    let theme = $state("");
    let documentType = $state("");
    let startDate = $state("");
    let endDate = $state("");
    let corpusId = $state("");
    let hierarchical = $state(false);
    let hierarchyLevel = $state<number | undefined>(undefined);

    let filterByRelevance = $state(false);
    let normalizeScores = $state(true);
    let confidenceMetrics: ConfidenceMetrics | undefined = $state(undefined);
    let confidenceLevel = $state<number | undefined>(undefined);
    let confidenceMessage = $state("");
    let confidenceStats = $state<{ min?: number; max?: number; avg?: number; median?: number } | undefined>(undefined);

    let searchResults = $state<SearchResponse | undefined>(undefined);
    let searchError = $state("");
    let isSearching = $state(false);
    
    // Récupérer la requête depuis l'URL si présente
    onMount(() => {
        const urlQuery = page.url.searchParams.get('query'); 
        if (urlQuery) {
            query = urlQuery;
            handleSearch();
        }
    });
    
    // Observer les changements d'URL pour réagir aux recherches rapides
    $effect(() => {
        const urlQuery = page.url.searchParams.get('query');  
        if (urlQuery && urlQuery !== query) {
            query = urlQuery;
            handleSearch();
        }
    });

    // Fonction pour rechercher des documents
    async function handleSearch() {
        if (!query.trim()) {
            searchError = "Veuillez entrer une requête de recherche";
            return;
        }
        
        isSearching = true;
        searchError = "";
        
        try {
            const request: SearchRequest = {
                query,
                topK,
                theme: theme || undefined,
                documentType: documentType || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                corpusId: corpusId || undefined,
                hierarchical,
                hierarchyLevel: hierarchical ? hierarchyLevel : undefined,
                filterByRelevance,
                normalizeScores,
            };
            
            searchResults = await searchDocuments(request);
            console.log("Search Request:", JSON.stringify(request, null, 2));
            console.log("API Response:", JSON.stringify(searchResults, null, 2));

        } catch (err) {
            searchError = err instanceof Error ? err.message : "Une erreur inconnue est survenue.";
            searchResults = undefined;
        } finally {
            isSearching = false;
        }
    }
    
    // Fonction pour naviguer vers le document avec le chunk mis en évidence
    function navigateToDocument(documentId: number, chunkId: number) {
        goto(`/database/consult?id=${documentId}&highlight=${chunkId}`);
    }
    
    // Fonction pour obtenir la classe CSS du niveau de confiance
    function getConfidenceLevelClass(level: number): string {
        if (level >= 0.8) return "bg-success text-success-content";
        if (level >= 0.5) return "bg-warning text-warning-content";
        return "bg-error text-error-content";
    }
</script>

<main class="p-4 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Recherche de documents - CLEA</h1>

    <!-- Section pour rechercher des documents -->
    <section class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Rechercher des documents</h2>
        {#if searchError}
            <div class="alert alert-error mb-4">{searchError}</div>
        {/if}
        
        <form onsubmit="{(event) => { event.preventDefault(); handleSearch(); }}" class="bg-base-200 p-4 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control col-span-full">
                    <label for="query" class="label">
                        <span class="label-text">Requête de recherche</span>
                    </label>
                    <input 
                        type="text" 
                        id="query"
                        bind:value={query} 
                        placeholder="Que recherchez-vous ?" 
                        class="input input-bordered w-full" 
                        required 
                    />
                </div>
                
                <div class="form-control">
                    <label for="topK" class="label">
                        <span class="label-text">Nombre de résultats</span>
                    </label>
                    <input 
                        type="number" 
                        id="topK"
                        bind:value={topK} 
                        min="1" 
                        max="100" 
                        class="input input-bordered w-full"
                    />
                </div>
                
                <div class="form-control">
                    <label for="corpusId" class="label">
                        <span class="label-text">ID du corpus (optionnel)</span>
                    </label>
                    <input 
                        type="text" 
                        id="corpusId"
                        bind:value={corpusId} 
                        placeholder="Identifiant du corpus" 
                        class="input input-bordered w-full"
                    />
                </div>
                
                <div class="form-control">
                    <label for="theme" class="label">
                        <span class="label-text">Thème (optionnel)</span>
                    </label>
                    <input 
                        type="text" 
                        id="theme"
                        bind:value={theme} 
                        placeholder="Thème du document" 
                        class="input input-bordered w-full" 
                    />
                </div>
                
                <div class="form-control">
                    <label for="documentType" class="label">
                        <span class="label-text">Type de document (optionnel)</span>
                    </label>
                    <input 
                        type="text" 
                        id="documentType"
                        bind:value={documentType} 
                        placeholder="Type de document" 
                        class="input input-bordered w-full" 
                    />
                </div>
                
                <div class="form-control">
                    <label for="startDate" class="label">
                        <span class="label-text">Date de début (optionnel)</span>
                    </label>
                    <input 
                        type="date" 
                        id="startDate"
                        bind:value={startDate} 
                        class="input input-bordered w-full" 
                    />
                </div>
                
                <div class="form-control">
                    <label for="endDate" class="label">
                        <span class="label-text">Date de fin (optionnel)</span>
                    </label>
                    <input 
                        type="date" 
                        id="endDate"
                        bind:value={endDate} 
                        class="input input-bordered w-full" 
                    />
                </div>
                
                <div class="form-control">
                    <label class="cursor-pointer label">
                        <span class="label-text">Recherche hiérarchique</span>
                        <input type="checkbox" bind:checked={hierarchical} class="checkbox" />
                    </label>
                </div>
                
                <div class="form-control">
                    <label class="cursor-pointer label">
                        <span class="label-text">Filtrer par pertinence</span>
                        <input type="checkbox" bind:checked={filterByRelevance} class="checkbox" />
                    </label>
                    <span class="text-xs text-opacity-70">Supprime les résultats sous le seuil de pertinence minimal</span>
                </div>
                
                <div class="form-control">
                    <label class="cursor-pointer label">
                        <span class="label-text">Normaliser les scores</span>
                        <input type="checkbox" bind:checked={normalizeScores} class="checkbox" />
                    </label>
                    <span class="text-xs text-opacity-70">Convertit les scores entre 0 et 1 pour faciliter la comparaison</span>
                </div>
                
                
                {#if hierarchical}
                    <div class="form-control">
                        <label for="hierarchyLevel" class="label">
                            <span class="label-text">Niveau hiérarchique</span>
                        </label>
                        <select 
                            id="hierarchyLevel"
                            bind:value={hierarchyLevel} 
                            class="select select-bordered w-full"
                        >
                            <option value={undefined}>Tous les niveaux</option>
                            <option value={0}>Niveau 0</option>
                            <option value={1}>Niveau 1</option>
                            <option value={2}>Niveau 2</option>
                            <option value={3}>Niveau 3</option>
                        </select>
                    </div>
                {/if}
            </div>
            
            <div class="mt-4">
                <button type="submit" class="btn btn-primary w-full md:w-auto" disabled={isSearching}>
                    {#if isSearching}
                        <span class="loading loading-spinner"></span>
                        Recherche en cours...
                    {:else}
                        Rechercher
                    {/if}
                </button>
            </div>
        </form>
    </section>
    
    {#if searchResults}
        <section>
            <!-- Affichage des métriques de confiance -->
            {#if searchResults.confidence}
                <div class="mb-4">
                    <div class="card {getConfidenceLevelClass(searchResults.confidence.level)}">
                        <div class="card-body p-4">
                            <h3 class="card-title text-lg">
                                Indice de confiance: {(searchResults.confidence.level * 100).toFixed(1)}%
                            </h3>
                            <p>{searchResults.confidence.message}</p>
                            {#if searchResults.confidence.stats}
                                <div class="mt-2 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {#if searchResults.confidence.stats.min !== undefined}
                                        <div>Score min: {searchResults.confidence.stats.min.toFixed(3)}</div>
                                    {/if}
                                    {#if searchResults.confidence.stats.max !== undefined}
                                        <div>Score max: {searchResults.confidence.stats.max.toFixed(3)}</div>
                                    {/if}
                                    {#if searchResults.confidence.stats.avg !== undefined}
                                        <div>Moyenne: {searchResults.confidence.stats.avg.toFixed(3)}</div>
                                    {/if}
                                    {#if searchResults.confidence.stats.median !== undefined}
                                        <div>Médiane: {searchResults.confidence.stats.median.toFixed(3)}</div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
            
            <!-- Message informatif si disponible -->
            {#if searchResults.message}
                <div class="alert alert-info mb-4">
                    {searchResults.message}
                </div>
            {/if}
            
            <h2 class="text-xl font-semibold mb-4">
                Résultats ({searchResults.totalResults})
                {#if searchResults.totalResults > 0}
                    <span class="text-sm font-normal text-gray-500">pour "{searchResults.query}"</span>
                    {#if searchResults.normalized}
                        <span class="badge badge-sm ml-2">Scores normalisés</span>
                    {/if}
                {/if}
            </h2>
            
            <!-- Reste des résultats inchangé -->
            {#if searchResults.totalResults > 0}
                <div class="grid gap-4">
                    {#each searchResults.results as result (result.chunkId)}
                        <div class="card w-full text-left bg-base-100 shadow-md hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 border border-transparent hover:border-primary-100">
                            <div class="card-body">
                                <div 
                                    class="cursor-pointer"
                                    role="button"
                                    tabindex="0" 
                                    onclick={() => navigateToDocument(result.documentId, result.chunkId)}
                                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateToDocument(result.documentId, result.chunkId); }}
                                >
                                    <div class="flex justify-between items-start">
                                        <h3 class="card-title text-primary">
                                            {result.title}
                                        </h3>
                                        <div class="badge badge-secondary">Voir le document</div>
                                    </div>
                                    <p class="whitespace-pre-line">{result.content}</p>
                                    <div class="flex flex-wrap gap-2 mt-2">
                                        <span class="badge badge-primary">{result.theme}</span>
                                        <span class="badge">{result.documentType}</span>
                                        <span class="badge badge-outline">
                                            Score: {searchResults.normalized ? (result.score * 100).toFixed(1) + '%' : result.score.toFixed(3)}
                                        </span>
                                    </div>
                                </div>
                                
                                <details class="mt-2 cursor-pointer">
                                    <summary class="text-sm font-medium">
                                        Détails du document
                                    </summary>
                                    <div class="p-3 bg-base-200 rounded-lg mt-2">
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                            <p><strong>ID du document:</strong> {result.documentId}</p>
                                            <p><strong>ID du chunk:</strong> {result.chunkId}</p>
                                            {#if result.publishDate}
                                            <p><strong>Date de publication:</strong> {new Date(result.publishDate).toLocaleDateString()}</p>
                                            {/if}
                                            {#if result.hierarchyLevel !== undefined}
                                            <p><strong>Niveau hiérarchique:</strong> {result.hierarchyLevel}</p>
                                            {/if}
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="alert alert-info">
                    Aucun résultat trouvé pour votre recherche.
                </div>
            {/if}
        </section>
    {/if}
</main>