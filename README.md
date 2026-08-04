# EikPet — Backend

API NestJS de l'application **EikPet**. Voir le [README racine du projet](../README.md) pour la vue d'ensemble (fonctionnalités, architecture, mobile...) et [`CLAUDE.md`](../CLAUDE.md) pour les conventions.

## Stack

NestJS (TypeScript), MySQL en SQL brut via `mysql2` (aucun ORM, requêtes préparées uniquement), JWT maison, migrations SQL versionnées à la main.

## Démarrage

```bash
npm install
cp .env.example .env    # renseigner les variables (voir le detail dans .env.example)
npm run migrate          # applique les migrations SQL de /migrations
npm run start:dev        # http://localhost:3000, rechargement a chaud
```

## Scripts

```bash
npm run start:dev    # dev avec rechargement a chaud
npm run build          # compilation production
npm run start:prod     # lance le build compile
npm run lint            # ESLint (--fix)
npm test               # tests unitaires (Jest)
npm run test:e2e        # tests end-to-end (Supertest + base MySQL de test via .env.test)
npm run test:cov        # couverture de tests
npm run migrate         # applique les migrations non encore jouees
```

## Migrations

Fichiers `.sql` numérotés dans `migrations/`, appliqués dans l'ordre par `scripts/migrate.js` (table `schema_migrations` pour le suivi). **Ne jamais modifier une migration déjà appliquée en production** — toujours en créer une nouvelle.

## Structure

Un module NestJS par domaine métier (`animals`, `health`, `households`, `auth`, `subscriptions`, `providers`, `pension`, `seances`, `budget`, `weight`, `documents`, `notifications`, `calendar`) : controller + service + DTOs de validation + repository SQL dédié. Détail dans le [README racine](../README.md#modules-backend-backendsrc).
