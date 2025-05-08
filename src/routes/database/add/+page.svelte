<script lang="ts">
	import { addDocument } from '$lib/database';
	import type { DocumentCreate, ChunkCreate } from '$lib/types';

	let title = '';
	let content = '';
	let theme = '';
	let documentType = '';
	let publishDate = '';
	let successMessage = '';
	let errorMessage = '';

	// Variables pour l'upload de fichier
	let file: File | null = null;
	let maxLength = 1000;
	let fileTheme = 'Thème générique';
	let uploadInProgress = false;
	let uploadResults: Array<{
		document_id: string;
		chunks: number;
		corpus_id: string;
		index_needed: boolean;
		original_filename?: string;
		file_size?: number;
		index_message?: string;
	}> = [];

	// Fonction pour ajouter un document manuellement
	async function handleAddDocument() {
		const documentData: DocumentCreate = {
			title,
			theme,
			documentType,
			publishDate
		};

		const chunkData: ChunkCreate = {
			content,
			start_char: 0,
			end_char: content.length,
			hierarchyLevel: 3 // Niveau par défaut pour le texte complet
		};

		try {
			const result = await addDocument(documentData, [chunkData]);
			successMessage = 'Document ajouté avec succès !';
			errorMessage = '';
			console.log('Document ajouté avec succès : ', result);
			// Réinitialiser les champs du formulaire
			title = content = theme = documentType = publishDate = '';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Une erreur inconnue est survenue.';
			successMessage = '';
		}
	}

	// Fonction pour uploader un fichier et le traiter
	async function handleFileUpload() {
		if (!file) {
			errorMessage = 'Veuillez sélectionner un fichier';
			return;
		}

		uploadInProgress = true;
		errorMessage = '';
		successMessage = '';

		try {
			const formData = new FormData();
			formData.append('file', file);

			const url = new URL('http://localhost:8080/pipeline/process-and-store');
			url.searchParams.append('max_length', maxLength.toString());
			url.searchParams.append('theme', fileTheme);

			const response = await fetch(url.toString(), {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || 'Erreur lors du traitement du fichier');
			}

			uploadResults = await response.json();
			console.log('UploadeResult reçus: ', uploadResults);
			successMessage = `${uploadResults.length} document(s) ajouté(s) avec succès !`;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : "Une erreur lors de l'upload du fichier";
		} finally {
			uploadInProgress = false;
		}
	}

	// TypeScript-safe event handler for file input
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		file = target.files ? target.files[0] : null;
	}
</script>

<main class="p-4">
	<h1 class="text-2xl font-bold mb-4">Ajouter un document</h1>

	{#if successMessage}
		<div class="alert alert-success mb-4">{successMessage}</div>
	{/if}
	{#if errorMessage}
		<div class="alert alert-error mb-4">{errorMessage}</div>
	{/if}

	<div class="flex flex-col md:flex-row gap-8">
		<!-- Formulaire manuel -->
		<div class="flex-1">
			<h2 class="text-xl font-bold mb-4">Ajout manuel</h2>
			<form on:submit|preventDefault={handleAddDocument} class="space-y-4">
				<div class="form-control">
					<label for="title" class="label">
						<span class="label-text">Titre</span>
					</label>
					<input
						id="title"
						type="text"
						bind:value={title}
						placeholder="Titre"
						class="input input-bordered w-full"
						required
					/>
				</div>

				<div class="form-control">
					<label for="content" class="label">
						<span class="label-text">Contenu</span>
					</label>
					<textarea
						id="content"
						bind:value={content}
						placeholder="Contenu"
						class="textarea textarea-bordered w-full"
						required
					></textarea>
				</div>

				<div class="form-control">
					<label for="theme" class="label">
						<span class="label-text">Thème</span>
					</label>
					<input
						id="theme"
						type="text"
						bind:value={theme}
						placeholder="Thème"
						class="input input-bordered w-full"
						required
					/>
				</div>

				<div class="form-control">
					<label for="documentType" class="label">
						<span class="label-text">Type de document</span>
					</label>
					<input
						id="documentType"
						type="text"
						bind:value={documentType}
						placeholder="Type de document"
						class="input input-bordered w-full"
						required
					/>
				</div>

				<div class="form-control">
					<label for="publishDate" class="label">
						<span class="label-text">Date de publication</span>
					</label>
					<input
						id="publishDate"
						type="date"
						bind:value={publishDate}
						class="input input-bordered w-full"
						required
					/>
				</div>

				<button type="submit" class="btn btn-primary">Ajouter</button>
			</form>
		</div>

		<!-- Upload de fichier -->
		<div class="flex-1">
			<h2 class="text-xl font-bold mb-4">Upload de fichier</h2>
			<form on:submit|preventDefault={handleFileUpload} class="space-y-4">
				<div class="form-control">
					<label for="fileUpload" class="label">
						<span class="label-text">Fichier à traiter</span>
					</label>
					<input
						id="fileUpload"
						type="file"
						on:change={handleFileChange}
						class="file-input file-input-bordered w-full"
						required
					/>
				</div>

				<div class="form-control">
					<label for="maxLength" class="label">
						<span class="label-text">Taille maximale d'un chunk</span>
					</label>
					<input
						id="maxLength"
						type="number"
						bind:value={maxLength}
						min="100"
						class="input input-bordered w-full"
					/>
				</div>

				<div class="form-control">
					<label for="fileTheme" class="label">
						<span class="label-text">Thème</span>
					</label>
					<input
						id="fileTheme"
						type="text"
						bind:value={fileTheme}
						class="input input-bordered w-full"
					/>
				</div>

				<button type="submit" class="btn btn-primary w-full" disabled={uploadInProgress}>
					{#if uploadInProgress}
						<span class="loading loading-spinner"></span> Traitement en cours...
					{:else}
						Uploader et traiter
					{/if}
				</button>
			</form>

			{#if uploadResults.length > 0}
				<div class="mt-6">
					<h3 class="text-lg font-bold mb-2">Documents ajoutés :</h3>
					<div class="overflow-x-auto">
						<table class="table table-zebra w-full">
							<thead>
								<tr>
									<th>ID</th>
									<th>Titre</th>
									<th>Thème</th>
									<th>Type</th>
								</tr>
							</thead>
							<tbody>
								{#each uploadResults as document (document)}
									<tr>
										<td>{document.document_id}</td>
										<td>{document.original_filename}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>
