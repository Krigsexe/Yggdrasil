# Guide de Contribution a YGGDRASIL

Merci de votre interet pour YGGDRASIL ! Ce guide vous aidera a contribuer efficacement au projet.

## Table des Matieres

- [Code de Conduite](#code-de-conduite)
- [Comment Contribuer](#comment-contribuer)
- [Types de Contributions](#types-de-contributions)
- [Processus de Developpement](#processus-de-developpement)
- [Standards de Code](#standards-de-code)
- [Commits et Pull Requests](#commits-et-pull-requests)
- [Revue de Code](#revue-de-code)
- [Reconnaissance](#reconnaissance)

---

## Code de Conduite

En participant a ce projet, vous acceptez de respecter notre [Code de Conduite](CODE_OF_CONDUCT.md).

**En resume :** Soyez respectueux, inclusif, et constructif. YGGDRASIL est un projet pour l'humanite — agissons en consequence.

---

## Comment Contribuer

### 1. Trouvez votre voie

| Vous etes... | Vous pouvez... |
|--------------|----------------|
| **Developpeur** | Coder, reviewer, architecturer |
| **Chercheur IA** | Proposer des algorithmes, valider des approches |
| **Scientifique** | Alimenter MIMIR, verifier des sources |
| **Ethicien/Juriste** | Guider la gouvernance, les limites |
| **Designer** | Ameliorer l'UX, la documentation |
| **Traducteur** | Internationaliser le projet |
| **Testeur** | QA, red team, tests adversariaux |
| **Communicant** | Documenter, expliquer, evangeliser |

### 2. Premiers pas

```bash
# 1. Fork le repository
# Cliquez sur "Fork" sur GitHub

# 2. Clonez votre fork
git clone https://github.com/VOTRE_USERNAME/yggdrasil.git
cd yggdrasil

# 3. Ajoutez l'upstream
git remote add upstream https://github.com/Krigsexe/yggdrasil.git

# 4. Installez les dependances
pnpm install

# 5. Creez une branche pour votre contribution
git checkout -b feature/ma-contribution
```

### 3. Avant de coder

- **Verifiez les issues existantes** — Votre idee est peut-etre deja en discussion
- **Ouvrez une issue** si vous proposez quelque chose de nouveau
- **Discutez** dans les issues avant de commencer un gros travail

---

## Types de Contributions

### Rapporter un Bug

1. Verifiez qu'il n'existe pas deja une issue similaire
2. Utilisez le template de bug report
3. Incluez :
   - Version de YGGDRASIL
   - Etapes pour reproduire
   - Comportement attendu vs observe
   - Logs pertinents

### Proposer une Feature

1. Ouvrez une issue avec le template "Feature Request"
2. Expliquez :
   - Le probleme que ca resout
   - La solution proposee
   - Les alternatives considerees
   - L'impact sur les Sept Piliers

### Ameliorer la Documentation

La documentation est aussi importante que le code !

- Corrections de typos : PR directe
- Nouvelles sections : Issue d'abord
- Traductions : Voir `docs/translations/`

### Contribuer au Code

Voir [Processus de Developpement](#processus-de-developpement)

---

## Processus de Developpement

### Structure du Monorepo

```
packages/
├── heimdall/      # Gateway
├── ratatosk/      # Routage
├── mimir/         # Branche Validee
├── volva/         # Branche Recherche
├── hugin/         # Branche Internet
├── thing/         # Consortium
├── odin/          # Maestro
├── munin/         # Memoire
└── shared/        # Utilitaires communs
```

### Workflow de developpement

```bash
# 1. Synchronisez avec upstream
git fetch upstream
git checkout main
git merge upstream/main

# 2. Creez une branche
git checkout -b type/description
# Types: feature/, fix/, docs/, refactor/, test/

# 3. Developpez avec des commits atomiques
git add .
git commit -m "type(scope): description"

# 4. Testez
pnpm test
pnpm lint

# 5. Push et creez une PR
git push origin type/description
```

### Environnement de developpement

```bash
# Lancer tous les services en dev
pnpm dev

# Lancer un package specifique
pnpm --filter @yggdrasil/heimdall dev

# Tests
pnpm test              # Tous les tests
pnpm test:unit         # Tests unitaires
pnpm test:integration  # Tests d'integration
pnpm test:e2e          # Tests end-to-end

# Linting
pnpm lint              # Verifier
pnpm lint:fix          # Corriger automatiquement
```

---

## Standards de Code

### TypeScript

```typescript
// BON
interface ValidationResult {
  isValid: boolean;
  confidence: number;
  sources: Source[];
  trace: DecisionTrace;
}

async function validateClaim(
  claim: string,
  context: QueryContext
): Promise<ValidationResult> {
  // Implementation
}

// MAUVAIS
function validate(c: any): any {
  // ...
}
```

### Principes

1. **Typage strict** — Pas de `any`, utilisez des types precis
2. **Immutabilite** — Preferez `const` et les structures immutables
3. **Fonctions pures** — Minimisez les effets de bord
4. **Nommage explicite** — Le code doit etre auto-documente
5. **Tests** — Chaque feature doit avoir des tests

### Structure des fichiers

```
package/
├── src/
│   ├── index.ts           # Export public
│   ├── module.ts          # Module NestJS
│   ├── controller.ts      # Controleurs
│   ├── service.ts         # Services
│   ├── dto/               # Data Transfer Objects
│   ├── entities/          # Entites
│   └── utils/             # Utilitaires
├── test/
│   ├── unit/
│   └── integration/
└── README.md
```

---

## Commits et Pull Requests

### Format des commits

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) :

```
type(scope): description courte

Corps optionnel avec plus de details.

Refs: #123
```

**Types :**
- `feat` — Nouvelle fonctionnalite
- `fix` — Correction de bug
- `docs` — Documentation
- `style` — Formatage (pas de changement de code)
- `refactor` — Refactoring
- `test` — Ajout/modification de tests
- `chore` — Maintenance

**Scopes :** `heimdall`, `ratatosk`, `mimir`, `volva`, `hugin`, `thing`, `odin`, `munin`, `shared`, `docs`, `ci`

### Exemples

```bash
feat(mimir): add arXiv source integration
fix(odin): correct validation threshold calculation
docs(readme): update installation instructions
test(thing): add consensus algorithm tests
```

### Pull Requests

Votre PR doit :

1. Avoir un titre clair suivant le format des commits
2. Referencer l'issue associee
3. Inclure une description de ce qui change et pourquoi
4. Passer tous les tests CI
5. Avoir au moins une review approuvee
6. Ne pas avoir de conflits avec `main`

**Template de PR :**

```markdown
## Description
Qu'est-ce que cette PR fait ?

## Motivation
Pourquoi ce changement ?

## Type de changement
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Checklist
- [ ] J'ai lu le CONTRIBUTING.md
- [ ] Mon code suit les standards du projet
- [ ] J'ai ajoute des tests
- [ ] J'ai mis a jour la documentation
- [ ] Mes commits suivent le format conventionnel

## Issue liee
Fixes #(numero)
```

---

## Revue de Code

### En tant qu'auteur

- Repondez aux commentaires de maniere constructive
- Expliquez vos choix si necessaire
- Mettez a jour votre PR suite aux retours
- Demandez des clarifications si un commentaire n'est pas clair

### En tant que reviewer

- Soyez respectueux et constructif
- Expliquez le "pourquoi" de vos suggestions
- Distinguez les blockers des suggestions
- Approuvez quand c'est pret, meme si ce n'est pas "parfait"

**Legende des commentaires :**
- `[BLOCKER]` — Doit etre corrige avant merge
- `[SUGGESTION]` — Amelioration optionnelle
- `[QUESTION]` — Demande de clarification
- `[NIT]` — Detail mineur (typo, style)

---

## Reconnaissance

Tous les contributeurs sont reconnus :

1. **Dans le code** — Auteurs des commits
2. **Dans README** — Section Contributors
3. **Dans CHANGELOG** — Credit par version
4. **Sur le site** — Hall of Fame (a venir)

### Niveaux de contribution

| Niveau | Criteres |
|--------|----------|
| **Pousse** | Premiere contribution acceptee |
| **Branche** | 5+ contributions significatives |
| **Tronc** | Contributeur regulier, reviewer |
| **Gardien** | Maintainer, decisions architecturales |

---

## Questions ?

- **Discord** : [A venir]
- **Discussions GitHub** : [github.com/Krigsexe/yggdrasil/discussions](https://github.com/Krigsexe/yggdrasil/discussions)
- **Email** : contact@yggdrasil.dev (placeholder)

---

<div align="center">

**Merci de contribuer a YGGDRASIL !**

*L'Arbre grandit avec ceux qui le nourrissent.*

</div>
