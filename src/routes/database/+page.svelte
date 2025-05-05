<script lang="ts">
    import { listDocuments, deleteDocument } from "$lib/database";
    import { cleanupOrphanedIndexes } from "$lib/index"; // Importation de la nouvelle fonction
    import type { DocumentOut } from "$lib/types";
    import { goto } from '$app/navigation';

    // Variables existantes
    let documents: DocumentOut[] = [];
    let listError = "";
    let deleteSuccess = "";
    let deleteError = "";
    let isDeleting = false;
    
    // Nouvelle variable pour l'état de nettoyage
    let isCleaning = false;
    let cleanupMessage = "";
    
    // Variables pour la sélection multiple (existantes)
    let selectedDocuments: Set<number> = new Set();
    let selectAll = false;
    $: selectedCount = selectedDocuments.size;
    $: allSelected = selectedCount === documents.length && documents.length > 0;
    
    // Fonction pour nettoyer les index orphelins
    async function cleanupIndexes() {
        isCleaning = true;
        cleanupMessage = "";
        
        try {
            const result = await cleanupOrphanedIndexes();
            
            if (result.status === "success") {
                const removedIndexes = result.removed_indexes || 0;
                const removedConfigs = result.removed_configs || 0;
                const removedViews = result.removed_views || 0;
                
                if (removedIndexes > 0 || removedConfigs > 0 || removedViews > 0) {
                    cleanupMessage = `Index nettoyés avec succès: ${removedIndexes} index, ${removedConfigs} configurations et ${removedViews} vues supprimés.`;
                } else {
                    cleanupMessage = "Aucun index orphelin trouvé. Tout est déjà propre!";
                }
            } else {
                throw new Error(result.message || "Une erreur est survenue lors du nettoyage des index");
            }
        } catch (err) {
            cleanupMessage = `Erreur: ${err instanceof Error ? err.message : "Une erreur inconnue est survenue"}`;
        } finally {
            isCleaning = false;
            
            // Rafraîchir la liste des documents pour refléter les changements
            await loadDocuments();
        }
    }
    
    // Fonctions existantes...
    async function loadDocuments() {
        try {
            documents = await listDocuments();
            listError = "";
            // Réinitialiser les sélections quand on recharge les documents
            selectedDocuments = new Set();
            selectAll = false;
            // Effacer les messages précédents
            deleteSuccess = "";
            deleteError = "";
        } catch (err) {
            listError = err instanceof Error ? err.message : "Une erreur inconnue est survenue.";
        }
    }
    
    async function deleteMultipleDocuments(ids: number[]) {
        try {
            for (const id of ids) {
                await deleteDocument(id);
            }
        } catch (err) {
            throw new Error(
                err instanceof Error
                    ? err.message
                    : "Une erreur est survenue lors de la suppression des documents."
            );
        }
    }

    // Toggle la sélection d'un document
    function toggleDocumentSelection(documentId: number, event: MouseEvent | KeyboardEvent) {
        // Empêcher la navigation quand on clique sur la checkbox
        event.stopPropagation();

        if (selectedDocuments.has(documentId)) {
            selectedDocuments.delete(documentId);
        } else {
            selectedDocuments.add(documentId);
        }
        // Force reactivity
        selectedDocuments = new Set([...selectedDocuments]);
        // Mettre à jour selectAll si tous les documents sont sélectionnés
        selectAll = selectedDocuments.size === documents.length;
    }

    // Surveiller les changements de selectAll et réagir en conséquence
    $: if (selectAll !== undefined) {
        if (selectAll) {
            selectedDocuments = new Set(documents.map(doc => doc.id));
        } else {
            selectedDocuments = new Set();
        }
        // Force reactivity
        selectedDocuments = new Set([...selectedDocuments]);
    }

    // Naviguer vers la page de consultation du document
    function navigateToDocument(documentId: number) {
        goto(`/database/consult?id=${documentId}`);
    }
    // Supprimer les documents sélectionnés
    async function deleteSelectedDocuments() {
        // Confirmer avant de supprimer
        const idsToDelete = [...selectedDocuments];
        if (idsToDelete.length === 0) return;
        
        const confirmMessage = idsToDelete.length === 1 
            ? "Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible."
            : `Êtes-vous sûr de vouloir supprimer ces ${idsToDelete.length} documents ? Cette action est irréversible.`;
            
        if (!confirm(confirmMessage)) {
            return;
        }
        
        isDeleting = true;
        try {
            // Supposons que nous avons une fonction pour supprimer plusieurs documents
            await deleteMultipleDocuments(idsToDelete);
            deleteSuccess = `${idsToDelete.length} document(s) supprimé(s) avec succès.`;
            deleteError = "";
            // Recharger la liste des documents
            await loadDocuments();
        } catch (err) {
            deleteError = err instanceof Error ? err.message : "Une erreur lors de la suppression des documents.";
            deleteSuccess = "";
        } finally {
            isDeleting = false;
        }
    }

    // Charger les documents au montage
    loadDocuments();
</script>

<main class="p-4 max-w-7xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Consultation des documents</h1>

    {#if listError}
        <div class="alert alert-error mb-4">{listError}</div>
    {/if}
    
    {#if deleteSuccess}
        <div class="alert alert-success mb-4">{deleteSuccess}</div>
    {/if}
    
    {#if deleteError}
        <div class="alert alert-error mb-4">{deleteError}</div>
    {/if}
    
    <!-- Contrôles pour la sélection multiple -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4 border-b pb-4">
        <div class="flex items-center gap-4">
            <div class="form-control">
                <label class="cursor-pointer label" for="selectAll">
                    <input type="checkbox" id="selectAll" bind:checked={selectAll} class="checkbox" />
                    <span class="label-text ml-2">Sélectionner tout ({selectedCount}/{documents.length})</span>
                </label>
            </div>
            
            <button class="btn btn-sm btn-outline" on:click={loadDocuments}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rafraîchir
            </button>
        </div>
            <!-- Nouveau bouton pour nettoyer les index -->
            <button 
                class="btn btn-sm btn-outline btn-accent" 
                on:click={cleanupIndexes}
                disabled={isCleaning}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {#if isCleaning}
                    <span class="loading loading-spinner loading-xs"></span>
                {/if}
                Nettoyer les index
            </button>
        <!-- Bouton de suppression multiple -->
        {#if selectedCount > 0}
            <button 
                class="btn btn-sm btn-error" 
                on:click={deleteSelectedDocuments}
                disabled={isDeleting}
            >
                {#if isDeleting}
                    <span class="loading loading-spinner loading-xs"></span>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                {/if}
                Supprimer {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
            </button>
        {/if}
    </div>

    <!-- Grille des documents -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {#each documents as doc}
            <button 
                type="button"
                class="card bg-base-100 shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-102 hover:-translate-y-1 duration-200"
                on:click={() => navigateToDocument(doc.id)}
                on:keydown={(e) => e.key === 'Enter' && navigateToDocument(doc.id)}
                aria-label={`View document ${doc.title}`}
            >
                <div class="card-body p-4">
                    <div class="flex items-start gap-2">
                        <input 
                            type="checkbox" 
                            on:keydown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    toggleDocumentSelection(doc.id, new MouseEvent('click'));
                                }
                            }}
                            checked={selectedDocuments.has(doc.id)}
                            on:click={(e) => toggleDocumentSelection(doc.id, e)}
                            on:keydown={(e) => e.key === 'Enter' && toggleDocumentSelection(doc.id, e)}
                        />
                        <div class="flex-1">
                            <h2 class="card-title text-lg font-bold mb-2 line-clamp-2">{doc.title}</h2>
                            
                            <div class="badge badge-sm mb-2">{doc.theme}</div>
                            <div class="badge badge-outline badge-sm ml-1 mb-2">{doc.documentType}</div>
                            
                            <div class="text-xs text-gray-500 grid grid-cols-1 gap-1 mt-3">
                                <p><span class="font-semibold">ID:</span> {doc.id}</p>
                                <p><span class="font-semibold">Date:</span> {new Date(doc.publishDate).toLocaleDateString()}</p>
                                <p><span class="font-semibold">Corpus:</span> {doc.corpusId || 'Non défini'}</p>
                                <p><span class="font-semibold">Chunks:</span> {doc.chunkCount}</p>
                            </div>
                            
                            {#if doc.indexMessage}
                                <div class={`mt-2 text-xs ${doc.indexNeeded ? 'text-warning' : 'text-success'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={doc.indexNeeded ? 
                                            "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : 
                                            "M5 13l4 4L19 7"} />
                                    </svg>
                                    {doc.indexMessage}
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            </button>
        {/each}
    </div>
    
    {#if documents.length === 0}
        <div class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Aucun document trouvé. Veuillez en ajouter ou rafraîchir la liste.</span>
        </div>
    {/if}
</main>

<style>
    /* Animation supplémentaire pour le survol des cartes */
    .hover\:scale-102:hover {
        transform: scale(1.02);
    }
</style>