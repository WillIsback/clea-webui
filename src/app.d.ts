// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Déclarer l'espace de noms pour les variables d'environnement
declare namespace import_meta {
    interface Env {
        PUBLIC_API_URL: string;
    }
}

// Extension pour $env/static/public
declare module '$env/static/public' {
    export const PUBLIC_API_URL: string;
}