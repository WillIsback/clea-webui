<script lang="ts">
	import { onMount } from 'svelte';
	import { askAI, askAIStream, getAvailableModels } from '$lib/rag';
	import type { AskAIRequest, SearchResponse } from '$lib/types';

	// Types pour l'historique de conversation
	interface Message {
		role: 'user' | 'assistant';
		content: string;
		thinking?: string;
		context?: SearchResponse;
		timestamp: Date;
		pending?: boolean;
	}

	// États de l'application
	let query = $state('');
	let messages = $state<Message[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let useStreaming = $state(true);

	// Configuration du modèle
	let availableModels = $state<string[]>([]);
	let selectedModel = $state('Qwen3-0.6B');
	let promptType = $state<'standard' | 'summary' | 'comparison'>('standard');

	// Filtres
	let theme = $state('');
	let documentType = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let corpusId = $state('');
	let useHierarchical = $state(false);
	let hierarchyLevel = $state<number | undefined>(undefined);
	let enableThinking = $state(true);

	// État du drawer pour le contexte
	let activeContext = $state<SearchResponse | undefined>(undefined);
	let isDrawerOpen = $state(false);

	// Configuration visible ou non
	let showConfig = $state(false);

	// Référence à la zone de messages pour auto-scroll
	let messagesContainer: HTMLElement;

	onMount(async () => {
		try {
			// Récupérer la liste des modèles disponibles
			availableModels = await getAvailableModels();

			// Message de bienvenue
			messages = [
				{
					role: 'assistant',
					content: "Bonjour ! Je suis l'assistant CLEA. Comment puis-je vous aider aujourd'hui ?",
					timestamp: new Date()
				}
			];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Une erreur est survenue lors du chargement';
		}
	});

	// Fonction pour ouvrir le drawer avec le contexte
	function openContext(context: SearchResponse) {
		activeContext = context;
		isDrawerOpen = true;
	}

	// Fonction pour fermer le drawer
	function closeDrawer() {
		isDrawerOpen = false;
	}

	// Fonction pour envoyer un message
	async function sendMessage() {
		if (!query.trim()) return;

		const userQuery = query.trim();
		query = '';
		error = null;

		// Ajouter le message de l'utilisateur à l'historique
		messages = [
			...messages,
			{
				role: 'user',
				content: userQuery,
				timestamp: new Date()
			}
		];

		// Ajouter un message vide pour l'assistant (sera rempli progressivement en streaming)
		messages = [
			...messages,
			{
				role: 'assistant',
				content: '',
				timestamp: new Date(),
				pending: true
			}
		];

		// Scroll automatique vers le bas
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 50);

		// Préparer la requête
		const request: AskAIRequest = {
			query: userQuery,
			modelName: selectedModel,
			stream: useStreaming,
			promptType: promptType,
			enableThinking: enableThinking,
			filters: {
				theme: theme || undefined,
				documentType: documentType || undefined,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
				corpusId: corpusId || undefined,
				hierarchical: useHierarchical,
				hierarchyLevel: useHierarchical ? hierarchyLevel : undefined
			}
		};

		isLoading = true;

		try {
			if (useStreaming) {
				// Mode streaming
				const { stream, contextPromise } = await askAIStream(request);
				const reader = stream.getReader();
				const decoder = new TextDecoder();
				let responseText = '';
				let thinkingText = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value);
					// Traiter les chunks SSE
					const lines = chunk.split('\n\n');

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.substring(6);

							if (data === '[DONE]') {
								// Fin du stream
								break;
							}

							try {
								// Parser le JSON du chunk
								const jsonData = JSON.parse(data);

								if (jsonData.type === 'thinking') {
									thinkingText += jsonData.content;
								} else if (jsonData.type === 'response') {
									responseText += jsonData.content;
								} else if (jsonData.type === 'transition') {
									// Transition entre les messages
									continue;
								} else if (jsonData.type === 'error') {
									// Erreur dans le stream
									throw new Error(jsonData.message);
								} else if (jsonData.type === 'done') {
									// Fin de la réponse
									break;
								}

								// Mettre à jour le message de l'assistant en temps réel
								const lastIndex = messages.length - 1;
								messages[lastIndex].thinking = thinkingText;
								messages[lastIndex].content = responseText;
								messages = [...messages]; // Force update
							} catch (e) {
								console.error('Erreur de parsing JSON:', e, 'pour le chunk:', data);
							}
						}
					}
				}

				// Finaliser le message avec le contexte récupéré
				const context = await contextPromise;
				console.log('Context reçu:', context);
				if (context) {
					const lastIndex = messages.length - 1;
					messages[lastIndex].context = context as unknown as SearchResponse;
					messages[lastIndex].pending = false;
					messages = [...messages]; // Force update
				}
			} else {
				// Mode standard (non-streaming)
				const response = await askAI(request);
				const lastIndex = messages.length - 1;
				messages[lastIndex].content = response.response;
				messages[lastIndex].thinking = response.thinking;
				if (response.context) {
					messages[lastIndex].context = response.context as unknown as SearchResponse;
				}
				messages[lastIndex].pending = false;
				messages = [...messages]; // Force update
			}
		} catch (err) {
			// En cas d'erreur, afficher dans l'interface
			error =
				err instanceof Error
					? err.message
					: "Une erreur est survenue lors de la communication avec l'API";
			console.error('Erreur:', err);

			// Mettre à jour le message de l'assistant pour afficher l'erreur
			const lastIndex = messages.length - 1;
			messages[lastIndex].content = '❌ ' + error;
			messages[lastIndex].pending = false;
		} finally {
			isLoading = false;

			// Scroll automatique vers le bas
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 50);
		}
	}
</script>

<main class="p-4 max-w-6xl mx-auto">
	<h1 class="text-3xl font-bold mb-4 flex items-center gap-2">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-8 w-8 text-accent"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
			/>
		</svg>
		Assistant CLEA
	</h1>

	<!-- Bouton pour afficher/masquer la configuration -->
	<div class="mb-4">
		<button class="btn btn-sm btn-accent" onclick={() => (showConfig = !showConfig)}>
			{showConfig ? 'Masquer la configuration' : 'Afficher la configuration'}
		</button>
	</div>

	<!-- Section de configuration -->
	{#if showConfig}
		<div class="bg-base-200 p-4 rounded-lg mb-6 shadow-md">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<!-- Configuration du modèle -->
				<div class="form-control">
					<label class="label" for="model-select">
						<span class="label-text">Modèle</span>
					</label>
					<select class="select select-bordered w-full" bind:value={selectedModel}>
						{#each availableModels as model (model)}
							<option value={model}>{model}</option>
						{/each}
					</select>
				</div>

				<!-- Type de prompt -->
				<div class="form-control">
					<label class="label" for="prompt-type">
						<span class="label-text">Type de requête</span>
					</label>
					<select class="select select-bordered w-full" bind:value={promptType}>
						<option value="standard">Standard</option>
						<option value="summary">Résumé</option>
						<option value="comparison">Comparaison</option>
					</select>
				</div>

				<!-- Options -->
				<div class="form-control">
					<label class="label" for="options">
						<span class="label-text">Options</span>
					</label>
					<div class="flex flex-col gap-2">
						<label class="label cursor-pointer justify-start gap-2">
							<input
								type="checkbox"
								class="toggle toggle-primary toggle-sm"
								bind:checked={useStreaming}
							/>
							<span class="label-text">Réponse en streaming</span>
						</label>
						<label class="label cursor-pointer justify-start gap-2">
							<input
								type="checkbox"
								class="toggle toggle-primary toggle-sm"
								bind:checked={enableThinking}
							/>
							<span class="label-text">Afficher le raisonnement</span>
						</label>
					</div>
				</div>

				<!-- Filtres -->
				<div class="form-control">
					<label class="label" for="theme">
						<span class="label-text">Thème</span>
					</label>
					<input
						id="theme"
						type="text"
						class="input input-bordered w-full"
						bind:value={theme}
						placeholder="Filtrer par thème"
					/>
				</div>

				<div class="form-control">
					<label class="label" for="documenType">
						<span class="label-text">Type de document</span>
					</label>
					<input
						id="documenType"
						type="text"
						class="input input-bordered w-full"
						bind:value={documentType}
						placeholder="Filtrer par type"
					/>
				</div>

				<div class="form-control">
					<label class="label" for="corpusId">
						<span class="label-text">ID de corpus</span>
					</label>
					<input
						id="corpusId"
						type="text"
						class="input input-bordered w-full"
						bind:value={corpusId}
						placeholder="ID du corpus (optionnel)"
					/>
				</div>

				<!-- Dates -->
				<div class="form-control">
					<label class="label" for="date-start">
						<span class="label-text">Date de début</span>
					</label>
					<input
						id="date-start"
						type="date"
						class="input input-bordered w-full"
						bind:value={startDate}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="data-end">
						<span class="label-text">Date de fin</span>
					</label>
					<input
						id="data-end"
						type="date"
						class="input input-bordered w-full"
						bind:value={endDate}
					/>
				</div>

				<!-- Options hiérarchiques -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-2">
						<input
							type="checkbox"
							class="toggle toggle-primary toggle-sm"
							bind:checked={useHierarchical}
						/>
						<span class="label-text">Utiliser la hiérarchie</span>
					</label>

					{#if useHierarchical}
						<label class="label" for="hierarchy-level">
							<span class="label-text">Niveau hiérarchique</span>
						</label>
						<input
							id="hierarchy-level"
							type="number"
							class="input input-bordered w-full"
							bind:value={hierarchyLevel}
							min="0"
							max="10"
							placeholder="Niveau"
						/>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Section de conversation -->
	<div class="flex flex-col h-[60vh] border rounded-lg overflow-hidden shadow-lg">
		<!-- Zone des messages -->
		<div class="flex-grow overflow-y-auto p-4 bg-base-100" bind:this={messagesContainer}>
			{#each messages as message, i (i)}
				<div class="chat {message.role === 'user' ? 'chat-end' : 'chat-start'} mb-4">
					<div class="chat-header opacity-75 text-xs">
						{message.role === 'user' ? 'Vous' : 'Assistant CLEA'}
						<time class="text-xs opacity-50 ml-1">
							{message.timestamp.toLocaleTimeString()}
						</time>
					</div>
					<div
						class="chat-bubble {message.role === 'user'
							? 'chat-bubble-accent'
							: 'chat-bubble-primary'} whitespace-pre-wrap break-words"
					>
						{#if message.thinking && enableThinking}
							<div class="thinking-content">
								<details>
									<summary class="cursor-pointer text-xs">Voir le raisonnement</summary>
									<div
										class="text-xs opacity-75 italic mt-1 mb-2 border-l-2 pl-2 border-base-content/30"
									>
										{message.thinking}
									</div>
								</details>
							</div>
						{/if}

						{#if message.pending}
							<span>{message.content || ''}</span>
							<span class="loading loading-dots loading-xs ml-1"></span>
						{:else}
							{message.content || ''}

							{#if message.context}
								<div class="context-link mt-2">
									<button
										class="text-xs text-accent underline hover:opacity-80"
										onclick={(e) => {
											e.stopPropagation();
											if (message.context) {
												openContext(message.context);
											}
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3 w-3 inline mr-1"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										Voir le contexte recherché
									</button>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{/each}

			{#if isLoading && messages.length === 0}
				<div class="flex justify-center items-center h-full">
					<span class="loading loading-spinner loading-lg text-primary"></span>
				</div>
			{/if}

			{#if error && messages.length === 0}
				<div class="alert alert-error mb-4">{error}</div>
			{/if}
		</div>

		<!-- Zone de saisie -->
		<div class="p-4 bg-base-200 border-t">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					sendMessage();
				}}
				class="flex gap-2"
			>
				<input
					type="text"
					class="input input-bordered flex-grow"
					placeholder="Posez votre question..."
					bind:value={query}
					disabled={isLoading}
				/>
				<button type="submit" class="btn btn-primary" disabled={isLoading || !query.trim()}>
					{#if isLoading}
						<span class="loading loading-spinner loading-xs"></span>
					{/if}
					Envoyer
				</button>
			</form>
			<p class="text-xs text-base-content/70 mt-2">
				Utilisez cette interface pour poser des questions sur les documents de votre base de
				connaissances.
			</p>
		</div>
	</div>
</main>

<!-- Drawer pour afficher le contexte - DÉPLACÉ HORS DU MAIN -->
<div class="drawer drawer-end">
	<input id="context-drawer" type="checkbox" class="drawer-toggle" bind:checked={isDrawerOpen} />
	<div class="drawer-side z-50">
		<label for="context-drawer" class="drawer-overlay"></label>
		<div class="p-4 w-full max-w-xl h-full bg-base-100 overflow-y-auto flex flex-col">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-lg font-bold">Contexte de recherche</h3>
				<button class="btn btn-sm btn-circle" onclick={closeDrawer}>✕</button>
			</div>

			{#if activeContext}
				<div class="flex flex-col gap-2 flex-grow">
					<!-- En-tête du contexte -->
					<div class="flex flex-col gap-1 p-3 bg-base-200 rounded-lg">
						<p><strong>Requête:</strong> {activeContext.query}</p>
						<p><strong>Nombre de résultats:</strong> {activeContext.totalResults}</p>
						{#if activeContext.confidence}
							<p>
								<strong>Indice de confiance:</strong>
								<span
									class={activeContext.confidence.level > 0.7
										? 'text-success'
										: activeContext.confidence.level > 0.4
											? 'text-warning'
											: 'text-error'}
								>
									{(activeContext.confidence.level * 100).toFixed(0)}%
								</span>
							</p>
							<p class="text-sm italic">{activeContext.confidence.message}</p>
						{/if}
					</div>

					<!-- Liste des documents trouvés -->
					<h4 class="text-md font-semibold mt-2">Documents pertinents</h4>
					{#if activeContext.results && activeContext.results.length > 0}
						<div class="overflow-y-auto flex-grow">
							{#each activeContext.results as result, index (result.chunkId)}
								<div
									class="border rounded p-3 mb-2 {index === 0 ? 'border-accent bg-accent/5' : ''}"
								>
									<div class="flex justify-between items-center">
										<h5 class="font-semibold">{result.title}</h5>
										<div
											class="badge {activeContext.normalized
												? result.score > 0.8
													? 'badge-success'
													: result.score > 0.5
														? 'badge-warning'
														: 'badge-error'
												: 'badge-primary'}"
										>
											Score: {activeContext.normalized
												? `${(result.score * 100).toFixed(1)}%`
												: result.score.toFixed(3)}
										</div>
									</div>
									<p class="text-sm mt-1">{result.content}</p>
									<div class="flex gap-2 mt-2 flex-wrap text-xs">
										{#if result.theme}
											<div class="badge badge-outline">{result.theme}</div>
										{/if}
										{#if result.documentType}
											<div class="badge badge-outline">{result.documentType}</div>
										{/if}
										{#if result.publishDate}
											<div class="badge badge-outline">
												{new Date(result.publishDate).toLocaleDateString()}
											</div>
										{/if}
										{#if result.hierarchyLevel !== undefined}
											<div class="badge badge-outline">Niveau {result.hierarchyLevel}</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="alert alert-warning">Aucun document pertinent trouvé.</div>
					{/if}
				</div>
			{:else}
				<div class="alert alert-info">Aucun contexte disponible pour cette réponse.</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Styles existants */
	.chat-bubble {
		max-width: 80%;
	}

	.loading-dots {
		animation: blink 1.4s infinite;
	}

	@keyframes blink {
		0% {
			opacity: 0.2;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.2;
		}
	}

	/* Nouveaux styles pour le thinking */
	.thinking-content {
		border-bottom: 1px solid rgba(127, 127, 127, 0.2);
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.thinking-content details summary {
		color: rgba(127, 127, 127, 0.8);
	}

	.thinking-content details summary:hover {
		color: rgba(127, 127, 127, 1);
	}

	/* Styles pour le contexte */
	.context-link {
		border-top: 1px dashed rgba(127, 127, 127, 0.2);
		padding-top: 0.5rem;
	}

	/* Styles pour le drawer - simplifiés et corrigés */
	.drawer-side {
		max-width: 95%;
	}

	.drawer-side > div {
		height: 100vh;
	}

	@media (max-width: 768px) {
		.drawer-side > div {
			max-width: 100%;
		}
	}
</style>
