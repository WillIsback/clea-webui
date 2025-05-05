<script lang="ts">
    import { page } from '$app/state';
    import { 
        getDocument, 
        deleteDocument, 
        getDocumentChunks, 
        deleteDocumentChunks, 
        updateDocument 
    } from "$lib/database";
    import { createCorpusIndex, getIndexStatus } from "$lib/index";
    import type { DocumentOut, ChunkCreate, IndexStatus } from "$lib/types";
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    // ID du document à consulter depuis l'URL
    const documentId = page.url.searchParams.get('id') ? parseInt(page.url.searchParams.get('id') || '0') : null;
    
    // Récupérer l'ID du chunk à mettre en évidence depuis l'URL
    const highlightChunkId = page.url.searchParams.get('highlight') ? parseInt(page.url.searchParams.get('highlight') || '0') : null;
    
    // États
    let document = $state<DocumentOut | null>(null);
    let chunks = $state<ChunkCreate[]>([]);
    let selectedChunk = $state<ChunkCreate | null>(null);
    let isEditing = $state(false);
    let isModalOpen = $state(false);
    let editedDocument = $state<Record<string, any> | null>(null);
    
    // États pour les messages
    let loadError = $state("");
    let updateSuccess = $state("");
    let updateError = $state("");
    let deleteSuccess = $state("");
    let deleteError = $state("");
    let indexStatus = $state<IndexStatus | null>(null);
    let indexing = $state(false);
    let indexSuccess = $state("");
    let indexError = $state("");

    // État pour le filtrage des chunks
    let selectedLevel = $state<number | null>(null);

    // États pour la recherche de chunks
    let chunkSearchQuery = $state("");
    let chunkSearchAttribute = $state<"content" | "id" | "level" | "parent">("content");
    let searchResults = $state<ChunkCreate[]>([]);;

    // Charger toutes les données nécessaires
    async function loadData() {
        if (!documentId) {
            loadError = "ID de document non spécifié dans l'URL";
            return;
        }

        try {
            // Charger le document
            document = await getDocument(documentId);
            
            // Charger les chunks
            try {
                chunks = await getDocumentChunks(documentId);
            } catch (err) {
                console.error("Erreur lors du chargement des chunks:", err);
                chunks = [];
            }
            
            // Vérifier l'état de l'index si un corpus est associé
            if (document.corpusId) {
                try {
                    const apiIndexStatus = await getIndexStatus(document.corpusId);
                    // Convertir les propriétés snake_case en camelCase
                    indexStatus = {
                        corpusId: apiIndexStatus.corpus_id,
                        indexExists: apiIndexStatus.index_exists,
                        configExists: apiIndexStatus.config_exists,
                        isIndexed: apiIndexStatus.is_indexed,
                        indexType: apiIndexStatus.index_type || null,
                        chunkCount: apiIndexStatus.chunk_count,
                        indexedChunks: apiIndexStatus.indexed_chunks,
                        lastIndexed: apiIndexStatus.last_indexed
                    };
                } catch (err) {
                    console.error("Erreur lors de la vérification de l'index:", err);
                }
            }
        } catch (err) {
            loadError = err instanceof Error ? err.message : "Une erreur inconnue est survenue.";
        }
    }
    // Fonction pour trouver et ouvrir le chunk mis en évidence
    function openHighlightedChunk() {
    if (!highlightChunkId || chunks.length === 0) return;
    
    const chunkToHighlight = chunks.find(chunk => chunk.id === highlightChunkId);
    if (chunkToHighlight) {
        // Ouvrir le modal avec ce chunk
        openChunkModal(chunkToHighlight);
        
        // Faire défiler la page jusqu'au chunk (avec une petite animation)
        setTimeout(() => {
            // Utiliser window.document au lieu de document
            const element = window.document.getElementById(`chunk-${highlightChunkId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Ajouter une mise en évidence temporaire
                element.classList.add('highlight-pulse');
                setTimeout(() => {
                    element.classList.remove('highlight-pulse');
                }, 2000);
            }
        }, 300);
    }
}

    // Observer quand les chunks sont chargés pour ouvrir automatiquement le chunk mis en évidence
    $effect(() => {
        if (chunks.length > 0 && highlightChunkId) {
            openHighlightedChunk();
        }
    });

    // Mettre à jour le document
    async function handleUpdateDocument() {
        if (!editedDocument || !document) return;

        try {
            const result = await updateDocument({
                id: document.id,
                ...editedDocument
            });
            updateSuccess = "Document mis à jour avec succès!";
            updateError = "";
            document = await getDocument(document.id);
            isEditing = false;
        } catch (err) {
            updateError = err instanceof Error ? err.message : "Une erreur lors de la mise à jour.";
            updateSuccess = "";
        }
    }

    // Supprimer le document
    async function handleDeleteDocument() {
        if (!document) return;
        
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le document "${document.title}"?`)) {
            return;
        }

        try {
            await deleteDocument(document.id);
            deleteSuccess = "Document supprimé avec succès!";
            deleteError = "";
            // Rediriger vers la liste des documents après un court délai
            setTimeout(() => goto('/database'), 1500);
        } catch (err) {
            deleteError = err instanceof Error ? err.message : "Une erreur lors de la suppression.";
            deleteSuccess = "";
        }
    }

    // Supprimer des chunks spécifiques
    async function handleDeleteChunk(chunkId: number) {
        if (!document) return;
        
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce chunk?")) {
            return;
        }

        try {
            await deleteDocumentChunks(document.id, [chunkId]);
            chunks = await getDocumentChunks(document.id);
            updateSuccess = "Chunk supprimé avec succès!";
            updateError = "";
        } catch (err) {
            updateError = err instanceof Error ? err.message : "Une erreur lors de la suppression du chunk.";
            updateSuccess = "";
        }
    }

    // Créer un index pour le corpus
    async function handleCreateIndex() {
        if (!document?.corpusId) return;
        
        indexing = true;
        indexSuccess = "";
        indexError = "";
        
        try {
            const result = await createCorpusIndex(document.corpusId);
            if (result.status === "success") {
                indexSuccess = result.message;
                if (document.corpusId) {
                    const apiIndexStatus = await getIndexStatus(document.corpusId);
                    // Convertir les propriétés snake_case en camelCase
                    indexStatus = {
                        corpusId: apiIndexStatus.corpus_id,
                        indexExists: apiIndexStatus.index_exists,
                        configExists: apiIndexStatus.config_exists,
                        isIndexed: apiIndexStatus.is_indexed,
                        indexType: apiIndexStatus.index_type || null,
                        chunkCount: apiIndexStatus.chunk_count,
                        indexedChunks: apiIndexStatus.indexed_chunks,
                        lastIndexed: apiIndexStatus.last_indexed
                    };
                }
                loadData();
            } else {
                indexError = result.message;
            }
        } catch (err) {
            indexError = err instanceof Error ? err.message : "Une erreur lors de la création de l'index.";
        } finally {
            indexing = false;
        }
    }

    // Ouvrir le modal pour un chunk spécifique
    function openChunkModal(chunk: ChunkCreate) {
        selectedChunk = chunk;
        isModalOpen = true;
    }

    // Gérer les événements clavier pour les éléments cliquables
    function handleKeyDown(event: KeyboardEvent, callback: () => void) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            callback();
        }
    }

    // Commencer l'édition du document
    function startEditing() {
        if (!document) return;
        
        editedDocument = {
            id: document.id,
            title: document.title || '',
            theme: document.theme || '',
            documentType: document.documentType || '',
            publishDate: document.publishDate || '',
            corpusId: document.corpusId || ''
        };
        
        isEditing = true;
    }

    // Annuler l'édition
    function cancelEditing() {
        isEditing = false;
        editedDocument = null;
    }
    
    // Fonction pour obtenir les niveaux hiérarchiques uniques disponibles
    function getAvailableHierarchyLevels(): number[] {
        if (!chunks || chunks.length === 0) return [];
        
        const levels = new Set<number>();
        chunks.forEach(chunk => {
            // Utiliser 0 comme valeur par défaut si hierarchyLevel est undefined
            const level = chunk.hierarchyLevel ?? 0;
            levels.add(level);
        });
        
        return Array.from(levels).sort((a, b) => a - b);
    }
    
    // Fonction pour rechercher des chunks
    function searchChunks() {
        if (!chunkSearchQuery.trim()) {
            // Si la recherche est vide, on n'applique pas de filtre supplémentaire
            searchResults = chunks;
            return;
        }
        
        const query = chunkSearchQuery.trim().toLowerCase();
        
        // Filtrer selon l'attribut sélectionné
        switch(chunkSearchAttribute) {
            case "content":
                searchResults = chunks.filter(chunk => 
                    chunk.content?.toLowerCase().includes(query)
                );
                break;
            case "id":
                searchResults = chunks.filter(chunk => 
                    chunk.id?.toString().includes(query)
                );
                break;
            case "level":
                searchResults = chunks.filter(chunk => 
                    (chunk.hierarchyLevel ?? 0).toString().includes(query)
                );
                break;
            case "parent":
                searchResults = chunks.filter(chunk => 
                    chunk.parent_id?.toString().includes(query)
                );
                break;
        }
    }
    
    // Fonction pour obtenir les chunks filtrés par niveau ET recherche
    function getFilteredChunks(): ChunkCreate[] {
        // D'abord on applique la recherche si elle existe
        const baseChunks = chunkSearchQuery.trim() ? searchResults : chunks;
        
        // Ensuite on filtre par niveau si nécessaire
        if (selectedLevel === null) return baseChunks;
        return baseChunks.filter(chunk => (chunk.hierarchyLevel ?? 0) === selectedLevel);
    }
    
    // Réinitialiser la recherche
    function resetSearch() {
        chunkSearchQuery = "";
        searchResults = chunks;
    }
    
    // Mettre à jour les résultats dès que les chunks sont chargés
    $effect(() => {
        if (chunks) {
            searchResults = chunks;
        }
    });


    // Charger les données au montage du composant
    onMount(loadData);
</script>

<main class="p-4 max-w-7xl mx-auto">
    {#if loadError}
        <div class="alert alert-error mb-6">{loadError}</div>
    {:else if !document}
        <div class="flex justify-center items-center h-40">
            <div class="loading loading-spinner loading-lg"></div>
        </div>
    {:else}
        <div class="flex flex-col md:flex-row md:justify-between items-start gap-4 mb-6">
            <div class="flex-1">
                <h1 class="text-3xl font-bold">{document.title}</h1>
                <div class="flex flex-wrap gap-2 mt-2">
                    <div class="badge badge-accent">{document.theme}</div>
                    <div class="badge badge-outline">{document.documentType}</div>
                </div>
                
                <div class="text-sm mt-4 space-y-1">
                    <p><span class="font-semibold">ID:</span> {document.id}</p>
                    <p><span class="font-semibold">Date de publication:</span> {new Date(document.publishDate).toLocaleDateString()}</p>
                    <p><span class="font-semibold">Corpus:</span> {document.corpusId || 'Non défini'}</p>
                    <p><span class="font-semibold">Nombre de chunks:</span> {document.chunkCount}</p>
                </div>
                
                {#if document.indexMessage}
                    <div class={`mt-4 text-sm ${document.indexNeeded ? 'text-warning' : 'text-success'} flex items-center`}>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={document.indexNeeded ? 
                                "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : 
                                "M5 13l4 4L19 7"} />
                        </svg>
                        {document.indexMessage}
                    </div>
                {/if}
            </div>
            
            <div class="flex flex-col gap-2">
                {#if !isEditing}
                    <button 
                        class="btn btn-primary" 
                        onclick={startEditing}
                        aria-label="Modifier le document"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Modifier
                    </button>
                    <button 
                        class="btn btn-error" 
                        onclick={handleDeleteDocument}
                        aria-label="Supprimer le document"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Supprimer
                    </button>
                {/if}
                
                {#if document.indexNeeded && document.corpusId}
                    <button 
                        class="btn btn-warning" 
                        onclick={handleCreateIndex}
                        disabled={indexing}
                        aria-label="Créer l'index pour ce document"
                    >
                        {#if indexing}
                            <span class="loading loading-spinner loading-xs"></span>
                            Indexation...
                        {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                            Créer l'index
                        {/if}
                    </button>
                {/if}
            </div>
        </div>
        
        <!-- Messages d'état -->
        {#if updateSuccess}
            <div class="alert alert-success mb-6" role="alert">{updateSuccess}</div>
        {/if}
        
        {#if updateError}
            <div class="alert alert-error mb-6" role="alert">{updateError}</div>
        {/if}
        
        {#if deleteSuccess}
            <div class="alert alert-success mb-6" role="alert">{deleteSuccess}</div>
        {/if}
        
        {#if deleteError}
            <div class="alert alert-error mb-6" role="alert">{deleteError}</div>
        {/if}
        
        {#if indexSuccess}
            <div class="alert alert-success mb-6" role="alert">{indexSuccess}</div>
        {/if}
        
        {#if indexError}
            <div class="alert alert-error mb-6" role="alert">{indexError}</div>
        {/if}
        
        <!-- Statut de l'index -->
        {#if indexStatus && document.corpusId}
            <div class="card bg-base-200 p-4 mb-6">
                <h3 class="font-bold mb-2">État de l'index</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="stat p-2 bg-base-100 rounded-lg">
                        <div class="stat-title">État</div>
                        <div class="stat-value text-lg flex items-center">
                            <span class={`w-3 h-3 inline-block rounded-full mr-2 ${indexStatus.indexExists ? 'bg-success' : 'bg-warning'}`}></span>
                            {indexStatus.indexExists ? 'Actif' : 'Inactif'}
                        </div>
                    </div>
                    
                    <div class="stat p-2 bg-base-100 rounded-lg">
                        <div class="stat-title">Type d'index</div>
                        <div class="stat-value text-lg">{indexStatus.indexType || 'N/A'}</div>
                    </div>
                    
                    <div class="stat p-2 bg-base-100 rounded-lg">
                        <div class="stat-title">Chunks indexés</div>
                        <div class="stat-value text-lg">{indexStatus.indexedChunks} / {indexStatus.chunkCount}</div>
                    </div>
                    
                    <div class="stat p-2 bg-base-100 rounded-lg">
                        <div class="stat-title">Dernière indexation</div>
                        <div class="stat-value text-lg">
                            {indexStatus.lastIndexed ? new Date(indexStatus.lastIndexed).toLocaleDateString() : 'Jamais'}
                        </div>
                    </div>
                </div>
            </div>
        {/if}
        
        <!-- Formulaire d'édition -->
        {#if isEditing && editedDocument}
        <div class="card bg-base-200 p-4 mb-6">
            <h2 class="text-xl font-bold mb-4">Modifier le document</h2>
            <form onsubmit={(e) => {
                e.preventDefault();
                handleUpdateDocument();
            }}>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="title" class="label">Titre</label>
                            <input 
                                type="text" 
                                id="title"
                                class="input input-bordered w-full" 
                                bind:value={editedDocument.title}
                                required
                            />
                        </div>
                        
                        <div>
                            <label for="theme" class="label">Thème</label>
                            <input 
                                type="text" 
                                id="theme"
                                class="input input-bordered w-full" 
                                bind:value={editedDocument.theme}
                                required
                            />
                        </div>
                        
                        <div>
                            <label for="docType" class="label">Type de document</label>
                            <input 
                                type="text" 
                                id="docType"
                                class="input input-bordered w-full" 
                                bind:value={editedDocument.documentType}
                                required
                            />
                        </div>
                        
                        <div>
                            <label for="publishDate" class="label">Date de publication</label>
                            <input 
                                type="date" 
                                id="publishDate"
                                class="input input-bordered w-full" 
                                bind:value={editedDocument.publishDate}
                                required
                            />
                        </div>
                        
                        <div>
                            <label for="corpusId" class="label">ID du corpus</label>
                            <input 
                                type="text" 
                                id="corpusId"
                                class="input input-bordered w-full" 
                                bind:value={editedDocument.corpusId}
                            />
                        </div>
                    
                    <div class="flex justify-end gap-2 mt-4">
                        <button type="button" class="btn btn-ghost" onclick={cancelEditing}>Annuler</button>
                        <button type="submit" class="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        {/if}
        
        <!-- Liste des chunks avec barre de recherche -->
        <div class="flex flex-col gap-4 mt-8">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <h2 class="text-2xl font-bold">Chunks du document ({chunks.length})</h2>
                
                <!-- Contrôles de filtrage -->
                <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div class="form-control">
                        <label class="label" for="filter-level">
                            <span class="label-text">Filtrer par niveau:</span>
                        </label>
                        <select 
                            id="filter-level"
                            class="select select-bordered"
                            bind:value={selectedLevel}
                            aria-label="Filtre par niveau hiérarchique"
                        >
                            <option value={null}>Tous les niveaux</option>
                            {#each getAvailableHierarchyLevels() as level}
                                <option value={level}>Niveau {level}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <!-- Barre de recherche de chunks -->
                    <div class="form-control flex-grow">
                        <label class="label" for="chunk-search">
                            <span class="label-text">Rechercher des chunks:</span>
                        </label>
                        <div class="flex gap-2">
                            <div class="join flex-grow">
                                <select 
                                    class="select select-bordered join-item"
                                    bind:value={chunkSearchAttribute}
                                    aria-label="Attribut de recherche"
                                >
                                    <option value="content">Contenu</option>
                                    <option value="id">ID</option>
                                    <option value="level">Niveau</option>
                                    <option value="parent">Parent</option>
                                </select>
                                <input 
                                    type="text" 
                                    id="chunk-search"
                                    class="input input-bordered join-item flex-grow"
                                    placeholder="Rechercher..." 
                                    bind:value={chunkSearchQuery}
                                    oninput={searchChunks}
                                />
                            </div>
                            {#if chunkSearchQuery}
                                <button 
                                    class="btn btn-ghost btn-square" 
                                    onclick={resetSearch}
                                    aria-label="Effacer la recherche"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>

            {#if chunks.length === 0}
                <div class="alert alert-info" role="status">Aucun chunk trouvé pour ce document.</div>
            {:else if getFilteredChunks().length === 0}
                <div class="alert alert-info" role="status">
                    Aucun chunk ne correspond aux critères de recherche.
                    <button class="btn btn-xs btn-ghost" onclick={resetSearch}>Réinitialiser</button>
                </div>
            {:else}
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {#each getFilteredChunks() as chunk}
                    <button 
                        id={`chunk-${chunk.id}`}
                        class="card bg-base-100 shadow hover:shadow-lg cursor-pointer transition-shadow text-left
                               ${chunk.id === highlightChunkId ? 'ring-2 ring-primary' : ''}" 
                        onclick={() => openChunkModal(chunk)}
                        onkeydown={(e) => handleKeyDown(e, () => openChunkModal(chunk))}
                        aria-label={`Voir les détails du chunk ${chunk.id}`}
                    >
                        <!-- Contenu existant inchangé -->
                        <div class="card-body p-4">
                            <div class="flex justify-between">
                                <span class="badge">Niveau {chunk.hierarchyLevel ?? 0}</span>
                                <span class="badge badge-outline">{chunk.id}</span>
                            </div>
                            <p class="mt-2 text-sm line-clamp-3">{chunk.content}</p>
                            <div class="text-xs text-gray-500 mt-2">
                                {#if chunk.start_char !== undefined && chunk.end_char !== undefined}
                                    <p>Positions: {chunk.start_char}-{chunk.end_char}</p>
                                {/if}
                            </div>
                        </div>
                    </button>
                {/each}
                </div>

                <!-- Affichage du compte des chunks filtrés -->
                <div class="text-sm text-gray-500 mt-2">
                    {#if chunkSearchQuery.trim() || selectedLevel !== null}
                        Affichage de {getFilteredChunks().length} chunks 
                        {#if selectedLevel !== null}de niveau {selectedLevel} {/if}
                        {#if chunkSearchQuery.trim()}correspondant à la recherche "{chunkSearchQuery}" {/if}
                        sur {chunks.length} au total
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</main>

<!-- Modal pour afficher les détails d'un chunk -->
{#if isModalOpen && selectedChunk}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="bg-base-100 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div class="p-4">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold" id="modal-title">Détails du chunk</h3>
                        <div class="badge mt-1">ID: {selectedChunk.id}</div>
                        <div class="badge badge-outline ml-2 mt-1">Niveau {selectedChunk.hierarchyLevel ?? 0}</div>
                    </div>
                    <button 
                        class="btn btn-sm btn-ghost" 
                        onclick={() => isModalOpen = false}
                        aria-label="Fermer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div class="border-t border-b py-3 my-3">
                    <h4 class="font-semibold mb-2">Contenu</h4>
                    <p class="whitespace-pre-wrap">{selectedChunk.content}</p>
                </div>
                
                <div class="text-sm grid grid-cols-2 gap-2">
                    {#if selectedChunk.parent_id}
                        <div>
                            <span class="font-semibold">Parent:</span> {selectedChunk.parent_id}
                        </div>
                    {/if}
                    
                    {#if selectedChunk.start_char !== undefined && selectedChunk.end_char !== undefined}
                        <div>
                            <span class="font-semibold">Positions:</span> {selectedChunk.start_char}-{selectedChunk.end_char}
                        </div>
                    {/if}
                </div>
                
                <div class="flex justify-end mt-4">
                    <button 
                        class="btn btn-error btn-sm" 
                        onclick={() => {
                            if (selectedChunk && selectedChunk.id) {
                                handleDeleteChunk(selectedChunk.id);
                                isModalOpen = false;
                            }
                        }}
                        disabled={!selectedChunk?.id}
                        aria-label="Supprimer ce chunk"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Supprimer ce chunk
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .line-clamp-3 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        line-clamp: 3;  /* Propriété standard pour compatibilité */
    }
    .highlight-pulse {
        animation: pulse 2s ease-in-out;
    }
    
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(var(--p), 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(var(--p), 0); }
        100% { box-shadow: 0 0 0 0 rgba(var(--p), 0); }
    }
</style>