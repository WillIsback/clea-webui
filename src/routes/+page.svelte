<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { getDashboardStats, refreshStatsCache } from '$lib/stats';
    import type { DashboardStats } from '$lib/types';

    // Fonction pour naviguer vers les différentes sections
    function navigateTo(path: string) {
        goto(path);
    }

    // État pour les statistiques
    let stats = $state<DashboardStats | null>(null);
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    let refreshing = $state(false);

    // Charger les statistiques au montage du composant
    onMount(async () => {
        await loadStats();
    });
    
    // Fonction pour charger les statistiques
    async function loadStats() {
        isLoading = true;
        error = null;
        
        try {
            stats = await getDashboardStats();
        } catch (err) {
            error = err instanceof Error ? err.message : "Une erreur est survenue lors du chargement des statistiques";
            console.error("Erreur:", err);
        } finally {
            isLoading = false;
        }
    }
    
    // Fonction pour rafraîchir le cache des statistiques
    async function handleRefresh() {
        if (refreshing) return;
        
        refreshing = true;
        try {
            const result = await refreshStatsCache();
            if (result.status === "success") {
                // Recharger les données fraîches
                await loadStats();
            }
        } catch (err) {
            error = err instanceof Error ? err.message : "Une erreur est survenue lors du rafraîchissement";
        } finally {
            refreshing = false;
        }
    }
</script>

<main class="container mx-auto p-4 md:p-8">
    <div class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-bold mb-3">CLEA Dashboard</h1>
        <p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Explorez, recherchez et interagissez avec vos documents intelligemment
        </p>
    </div>

    <!-- Grille modifiée pour 4 cartes: 2x2 sur mobile/tablette, 4x1 sur grand écran -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        <!-- Carte de recherche -->
        <div 
            class="card bg-base-100 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer h-80" 
            onclick={() => navigateTo('/search')}
            onkeydown={(e) => e.key === 'Enter' && navigateTo('/search')}
            tabindex="0"
            role="button"
            aria-label="Rechercher des documents"
        >
            <div class="card-body flex flex-col items-center justify-center text-center p-6">
                <div class="bg-primary/10 p-6 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <h2 class="card-title text-2xl mb-2">Rechercher</h2>
                <p>Explorez votre base documentaire avec la recherche sémantique avancée</p>
                <div class="mt-4">
                    <span class="badge badge-primary">Recherche vectorielle</span>
                </div>
            </div>
        </div>

        <!-- Carte de consultation -->
        <div 
            class="card bg-base-100 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer h-80" 
            onclick={() => navigateTo('/database')}
            onkeydown={(e) => e.key === 'Enter' && navigateTo('/database')}
            tabindex="0"
            role="button"
            aria-label="Consulter les documents"
        >
            <div class="card-body flex flex-col items-center justify-center text-center p-6">
                <div class="bg-secondary/10 p-6 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h2 class="card-title text-2xl mb-2">Consulter</h2>
                <p>Parcourez et gérez votre base de documents et leurs métadonnées</p>
                <div class="mt-4">
                    <span class="badge badge-secondary">Explorer</span>
                </div>
            </div>
        </div>

        <!-- Carte Ask (future fonctionnalité) -->
        <div 
            class="card bg-base-100 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer h-80 relative" 
            onclick={() => navigateTo('/ask')}
            onkeydown={(e) => e.key === 'Enter' && navigateTo('/ask')}
            tabindex="0"
            role="button"
            aria-label="Poser des questions à l'IA (Nouvelle fonctionnalité)"
        >
            <div class="absolute top-2 right-2">
                <span class="badge badge-accent animate-pulse">New</span>
            </div>
            <div class="card-body flex flex-col items-center justify-center text-center p-6">
                <div class="bg-accent/10 p-6 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </div>
                <h2 class="card-title text-2xl mb-2">Demander</h2>
                <p>Posez des questions à votre base de connaissance avec notre assistant IA</p>
                <div class="mt-4">
                    <span class="badge badge-accent">RAG</span>
                </div>
            </div>
        </div>
        
        <!-- NOUVELLE CARTE: Ajout de documents -->
        <div 
            class="card bg-base-100 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer h-80" 
            onclick={() => navigateTo('/database/add')}
            onkeydown={(e) => e.key === 'Enter' && navigateTo('/database/add')}
            tabindex="0"
            role="button"
            aria-label="Ajouter des documents à la base de connaissance"
        >
            <div class="card-body flex flex-col items-center justify-center text-center p-6">
                <div class="bg-success/10 p-6 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h2 class="card-title text-2xl mb-2">Ajouter</h2>
                <p>Enrichissez votre base de connaissance en ajoutant de nouveaux documents</p>
                <div class="mt-4">
                    <span class="badge badge-success">Upload</span>
                </div>
            </div>
        </div>
    </div>

    <div class="mt-16 text-center">
        <div class="flex justify-center items-center gap-3 mb-4">
            <h3 class="text-2xl font-bold">Statistiques de votre base documentaire</h3>
            <button 
                id="refresh-button"
                aria-label="Rafraîchir les statistiques"
                class="btn btn-sm btn-outline btn-primary" 
                onclick={handleRefresh}
                disabled={isLoading || refreshing}
                title="Rafraîchir les statistiques"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
        </div>
        
        {#if isLoading}
            <div class="flex justify-center my-8">
                <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
        {:else if error}
            <div class="alert alert-error max-w-lg mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Impossible de charger les statistiques: {error}</span>
            </div>
        {:else if stats}
            <div class="stats shadow inline-flex flex-wrap">
                <div class="stat">
                    <div class="stat-figure text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <div class="stat-title">Documents</div>
                    <div class="stat-value text-primary">{stats.documentStats.totalCount}</div>
                    <div class="stat-desc">
                        {stats.documentStats.percentChange > 0 ? '+' : ''}{stats.documentStats.percentChange}% par rapport à avant
                    </div>
                </div>
                
                <div class="stat">
                    <div class="stat-figure text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div class="stat-title">Recherches</div>
                    <div class="stat-value text-secondary">{stats.searchStats.totalCount.toLocaleString('fr-FR')}</div>
                    <div class="stat-desc">
                        ↗︎ {stats.searchStats.lastMonthCount} ({stats.searchStats.percentChange}%)
                    </div>
                </div>
                
                <div class="stat">
                    <div class="stat-figure text-accent">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div class="stat-title">Taux satisfaction</div>
                    <div class="stat-value text-accent">{stats.systemStats.satisfaction}%</div>
                    <div class="stat-desc">↗︎ {stats.systemStats.percentChange}%</div>
                </div>
                
                <!-- Statistique d'indexation -->
                <div class="stat">
                    <div class="stat-figure text-info">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                    </div>
                    <div class="stat-title">Corpus indexés</div>
                    <div class="stat-value text-info">{stats.systemStats.indexedCorpora}/{stats.systemStats.totalCorpora}</div>
                    <div class="stat-desc">
                        {Math.round((stats.systemStats.indexedCorpora / stats.systemStats.totalCorpora) * 100)}% de couverture
                    </div>
                </div>
            </div>
            
            <!-- Visualisation des thèmes -->
            {#if Object.keys(stats.documentStats.byTheme).length > 0}
                <div class="mt-8 max-w-xl mx-auto p-4 bg-base-200 rounded-lg">
                    <h4 class="font-semibold mb-3">Répartition par thème</h4>
                    <div class="flex gap-2 flex-wrap justify-center">
                        {#each Object.entries(stats.documentStats.byTheme) as [theme, count]}
                            <div class="badge badge-lg gap-2 m-1">
                                <span>{theme}</span>
                                <span class="badge badge-sm">{count}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
            
            <!-- Requêtes populaires -->
            {#if stats.searchStats.topQueries && stats.searchStats.topQueries.length > 0}
                <div class="mt-4 max-w-xl mx-auto p-4 bg-base-200 rounded-lg">
                    <h4 class="font-semibold mb-3">Requêtes populaires</h4>
                    <div class="flex gap-2 flex-wrap justify-center">
                        {#each stats.searchStats.topQueries as {query, count}}
                            <div class="badge badge-lg badge-secondary gap-2 m-1">
                                <span>{query}</span>
                                <span class="badge badge-sm">{count}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</main>