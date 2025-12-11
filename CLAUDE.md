# CLAUDE.md — YGGDRASIL

> **YGGDRASIL** : Architecture d'AGI ethique, souveraine et verifiable.
> **Vision** : "Une IA qui dit 'verifie + sources' ou 'je ne sais pas' — jamais 'probablement vrai'."

---

## ESSENCE DU PROJET

### Le Probleme

- **Hallucinations** : 20-30% des LLMs sont fausses avec meme confiance que les vraies
- **Opacite** : Impossible de comprendre pourquoi un modele repond X
- **Amnesie** : Chaque conversation repart de zero
- **Dependance** : Quelques corporations controlent l'IA mondiale

### La Solution YGGDRASIL

**Orchestrer** les LLMs existants (Claude, Llama, DeepSeek, Grok) avec une couche de validation garantissant :

- Veracite : 100% source ou rejet
- Tracabilite : Chaque decision explicable
- Memoire : Persistante et reversible
- Souverainete : Open-source, auto-hebergeable

---

## LES 7 PILIERS

| #   | Pilier                     | Implementation                                |
| --- | -------------------------- | --------------------------------------------- |
| 1   | **Veracite Absolue**       | Source MIMIR ou REJET, jamais d'hallucination |
| 2   | **Tracabilite Totale**     | `ValidationTrace` sur chaque reponse          |
| 3   | **Separation Epistemique** | MIMIR/VOLVA/HUGIN strictement separes         |
| 4   | **Memoire Vivante**        | MUNIN : temporelle + semantique + causale     |
| 5   | **Reversibilite**          | Checkpoints, rollback automatique             |
| 6   | **Souverainete**           | MIT + copyleft, Docker, multi-provider        |
| 7   | **Soutenabilite**          | Zero entrainement, serverless                 |

---

## ARCHITECTURE NORDIQUE

```
UTILISATEUR
  -> HEIMDALL (Gateway: auth, rate limit, audit)
  -> RATATOSK (Routage: classification, routing)
  -> [MIMIR 100% | VOLVA 50-99% | HUGIN 0-49%]
  -> THING (Conseil multi-modeles)
  -> ODIN (Validation finale)
  -> MUNIN (Memoire)
  -> REPONSE + SOURCES + TRACE
```

### Composants

| Module       | Role                                             | Stack                       |
| ------------ | ------------------------------------------------ | --------------------------- |
| **HEIMDALL** | Gateway, auth, audit                             | NestJS, Passport, Redis     |
| **RATATOSK** | Classification, routage                          | NestJS, ML classifier       |
| **MIMIR**    | Connaissances verifiees (100%)                   | PostgreSQL, PGVector        |
| **VOLVA**    | Hypotheses flaggees (50-99%)                     | PostgreSQL                  |
| **HUGIN**    | Web non-verifie (0-49%)                          | Scraper, anti-misinfo       |
| **THING**    | Conseil LLMs (KVASIR/BRAGI/NORNES/SAGA/LOKI/TYR) | Orchestrateur               |
| **ODIN**     | Validation, ancrage sources                      | Validation engine           |
| **MUNIN**    | Memoire chrono-semantique                        | PostgreSQL, PGVector, Redis |

### Conseil THING

| Membre | LLM      | Role                  |
| ------ | -------- | --------------------- |
| KVASIR | Claude   | Raisonnement          |
| BRAGI  | Grok     | Creativite            |
| NORNES | DeepSeek | Calcul                |
| SAGA   | Llama    | Connaissance          |
| LOKI   | Red team | Critique adversariale |
| TYR    | Voting   | Arbitrage final       |

---

## SEPARATION EPISTEMIQUE

```
+---------------+---------------+---------------+
|    MIMIR      |    VOLVA      |    HUGIN      |
| Confiance 100%| 50-99%        | 0-49%         |
| VERIFIED      | THEORY        | UNVERIFIED    |
| arXiv,PubMed  | Preprints     | Web, News     |
+---------------+---------------+---------------+
AUCUNE CONTAMINATION - Promotion uniquement sur PREUVE
```

---

## STACK TECHNIQUE

- **Framework** : NestJS (TypeScript strict)
- **Monorepo** : pnpm + Turborepo
- **DB** : PostgreSQL 16 + PGVector
- **Cache** : Redis
- **Queue** : BullMQ
- **ORM** : Prisma
- **Tests** : Vitest
- **CI/CD** : GitHub Actions

---

## STRUCTURE MONOREPO

```
packages/
├── shared/      # Types, erreurs, constantes, utils
├── heimdall/    # Gateway
├── ratatosk/    # Routage
├── mimir/       # Branche validee
├── volva/       # Branche recherche
├── hugin/       # Branche internet
├── thing/       # Conseil multi-modeles
├── odin/        # Maestro validation
└── munin/       # Memoire
```

---

## STANDARDS

### TypeScript

- Types explicites, jamais `any`
- Strict mode, null checks explicites
- Interfaces pour objets, enums pour constantes

### Commits

```
type(scope): description
Types: feat, fix, docs, style, refactor, test, chore
Scopes: heimdall, ratatosk, mimir, volva, hugin, thing, odin, munin, shared
```

### Securite

- Jamais de secrets en dur
- Validation entrees (Zod + class-validator)
- Rate limiting sur endpoints sensibles
- Audit logging systematique

---

## COMMANDES

```bash
pnpm install          # Installation
pnpm dev              # Developpement
pnpm build            # Build
pnpm test             # Tests
pnpm lint             # Linting
pnpm typecheck        # Verification types
```

---

## REGLES INVIOLABLES

1. **ODIN rejette** tout output non-ancre dans MIMIR
2. **JAMAIS** contaminer MIMIR avec HUGIN directement
3. **TOUJOURS** inclure `ValidationTrace`
4. **TOUJOURS** soft delete + audit log
5. **JAMAIS** `any` sans justification

---

## PHILOSOPHIE

> _"Je ne valide que ce que je peux prouver."_ — ODIN

Le code sert la vision :

- Un medecin l'utilisera pour ses patients
- Un enfant fera confiance a ses reponses
- L'humanite merite une IA qui ne ment pas

**L'Arbre grandit avec ceux qui le nourrissent.**

---

_Fondateur : Julien Gelee (@Krigsexe)_
_Licence : MIT + Copyleft_
