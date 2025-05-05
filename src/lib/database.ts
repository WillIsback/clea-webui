import type { 
    Document, 
    DocumentCreate, 
    DocumentUpdate, 
    ChunkCreate,
    UpdateWithChunks,
    DocumentOut
} from "./types";


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


// Fonction pour lister les documents
export async function listDocuments(
    theme?: string, 
    documentType?: string, 
    corpusId?: string,
    skip: number = 0,
    limit: number = 100
): Promise<DocumentOut[]> {
    // Construction de l'URL avec les paramètres de filtrage
    let url = `${API_BASE_URL}/database/documents?skip=${skip}&limit=${limit}`;
    if (theme) url += `&theme=${encodeURIComponent(theme)}`;
    if (documentType) url += `&documentType=${encodeURIComponent(documentType)}`;
    if (corpusId) url += `&corpusId=${encodeURIComponent(corpusId)}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des documents : ${response.statusText}`);
    }
    
    const documents = await response.json();
    console.log("Documents récupérés →", documents);
    // Ajout du champ indexMessage à chaque document en utilisant indexNeeded
    return documents.map((doc: DocumentOut) => ({
        ...doc,
        indexMessage: doc.indexNeeded 
            ? "Le corpus n'a pas d'index. Veuillez en créer un." 
            : "Index valide",
    }));
}
// Fonction pour récupérer un document par ID
export async function getDocument(id: number): Promise<DocumentOut> {
    const response = await fetch(`${API_BASE_URL}/database/documents/${id}`);
    if (!response.ok) {
        throw new Error(`Erreur lors de la récupération du document : ${response.statusText}`);
    }
    
    const document = await response.json();
    console.log("Document récupéré →", document);
    
    // Les API qui retournent un document unique n'ont pas besoin du .map
    return {
        ...document,
        indexMessage: document.indexNeeded 
            ? "Le corpus n'a pas d'index. Veuillez en créer un." 
            : "Index valide",
    };
}

// Fonction pour ajouter un document avec ses chunks
export async function addDocument(
    doc: DocumentCreate,
    chunks: ChunkCreate[],
  ): Promise<DocumentOut> {
    const res = await fetch(`${API_BASE_URL}/database/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: doc, chunks }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

// Fonction pour ajouter un document simple (rétrocompatibilité)
export async function addDocuments(documents: DocumentCreate, chunks: ChunkCreate){
    const newDoc = await addDocument(documents, [chunks]);
    console.log("Créé →", newDoc);
}

// Fonction pour mettre à jour un document
export async function updateDocument(document: DocumentUpdate): Promise<Document> {
    const response = await fetch(`${API_BASE_URL}/database/documents/${document.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document }),
    });
    if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour du document : ${response.statusText}`);
    }
    return response.json();
}

// Fonction pour mettre à jour un document avec ajout de chunks
export async function updateDocumentWithChunks(payload: UpdateWithChunks): Promise<Document> {
    const response = await fetch(`${API_BASE_URL}/database/documents/${payload.document.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour du document : ${response.statusText}`);
    }
    return response.json();
}

// Fonction pour supprimer un document
export async function deleteDocument(documentId: number): Promise<{ success: boolean }> {
    const response = await fetch(
        `${API_BASE_URL}/database/documents/${documentId}`,
        {
            method: "DELETE",
        }
    );
    if (!response.ok) {
        throw new Error(`Erreur lors de la suppression du document : ${response.statusText}`);
    }
    return { success: true };
}

// Fonction pour récupérer les chunks d'un document
export async function getDocumentChunks(
    documentId: number, 
    hierarchyLevel?: number,
    parentChunkId?: number
): Promise<ChunkCreate[]> {
    let url = `${API_BASE_URL}/database/documents/${documentId}/chunks`;
    if (hierarchyLevel !== undefined) url += `?hierarchyLevel=${hierarchyLevel}`;
    if (parentChunkId !== undefined) url += `${hierarchyLevel !== undefined ? '&' : '?'}parentChunkId=${parentChunkId}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des chunks : ${response.statusText}`);
    }
    return response.json();
}

// Fonction pour supprimer des chunks spécifiques
export async function deleteDocumentChunks(
    documentId: number,
    chunkIds?: number[]
): Promise<{ success: boolean, deleted: number }> {
    let url = `${API_BASE_URL}/database/documents/${documentId}/chunks`;
    
    if (chunkIds && chunkIds.length > 0) {
        url += '?' + chunkIds.map(id => `chunk_ids=${id}`).join('&');
    }
    
    const response = await fetch(url, {
        method: "DELETE",
    });
    
    if (!response.ok) {
        throw new Error(`Erreur lors de la suppression des chunks : ${response.statusText}`);
    }
    
    return response.json();
}