FROM node:20-slim AS build

WORKDIR /app

# Copie des fichiers package.json et package-lock.json pour installer les dépendances
COPY package*.json ./
RUN npm ci

# Copie du reste de l'application
COPY . .

# Construction de l'application
RUN npm run build

# Image de production
FROM node:20-slim AS runtime

WORKDIR /app

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Copie des fichiers nécessaires depuis l'étape de build
COPY --from=build /app/package*.json ./
COPY --from=build /app/build ./build

# Installation des dépendances de production uniquement
RUN npm ci --omit=dev

# Exposition du port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "build"]