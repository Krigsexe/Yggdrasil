# YGGDRASIL — Guide Claude Code

> **Vision** : "Une IA qui dit 'verifie + sources' ou 'je ne sais pas' — jamais 'probablement vrai'."

---

## CONTEXTE

**Fondateur** : Julien Gelee (@Krigsexe), fondateur d'Alixia (SaaS suisse, marketing digital)

**Evolution** : ODIN -> AEGIS -> YGGDRASIL (L'Arbre-Monde nordique)

**Question fondatrice** : Une "societe de modeles specialises" avec separation epistemique stricte et memoire chrono-semantique peut-elle completer les approches comme JEPA (LeCun) pour une transition vers l'AGI ?

**Gap identifie** : Aucun systeme existant ne combine :
- Separation stricte prouve/probable/bruit
- Refus de repondre si non verifiable
- Memoire structuree et reversible
- Open-source et auto-hebergeable

---

## LES 7 PILIERS

| # | Pilier | Implementation |
|---|--------|----------------|
| 1 | **Veracite Absolue** | Source MIMIR ou REJET |
| 2 | **Tracabilite Totale** | `ValidationTrace` sur chaque reponse |
| 3 | **Separation Epistemique** | MIMIR/VOLVA/HUGIN strictement separes |
| 4 | **Memoire Vivante** | Triple indexation : temporelle + semantique + causale |
| 5 | **Reversibilite** | Checkpoints, rollback automatique |
| 6 | **Souverainete** | MIT + copyleft, multi-provider |
| 7 | **Soutenabilite** | Zero entrainement, serverless |

---

## LES 7 LOIS

| Loi | Enonce |
|-----|--------|
| I | YGGDRASIL ne ment jamais |
| II | Toujours montrer le raisonnement |
| III | Prouve != Suppose != Bruit |
| IV | Droit a l'oubli selectif |
| V | Donnees appartiennent au createur |
| VI | Consommer que le necessaire |
| VII | Code appartient a l'humanite |

---

## ARCHITECTURE

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

| Module | Role |
|--------|------|
| **HEIMDALL** | Gateway, auth, audit |
| **RATATOSK** | Classification, routage |
| **MIMIR** | Connaissances verifiees (100%) |
| **VOLVA** | Hypotheses flaggees (50-99%) |
| **HUGIN** | Web non-verifie (0-49%) |
| **THING** | Conseil multi-LLMs |
| **ODIN** | Validation, ancrage |
| **MUNIN** | Memoire chrono-semantique |

### Conseil THING

| Membre | LLM | Role |
|--------|-----|------|
| KVASIR | Claude | Raisonnement |
| BRAGI | Grok | Creativite |
| NORNES | DeepSeek | Calcul |
| SAGA | Llama | Connaissance |
| LOKI | Red team | Critique |
| TYR | Voting | Arbitrage |

### Separation Epistemique

```
MIMIR (100%)     VOLVA (50-99%)    HUGIN (0-49%)
VERIFIED         THEORY            UNVERIFIED
arXiv, PubMed    Preprints         Web, News
```
**AUCUNE CONTAMINATION** - Promotion uniquement sur PREUVE

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

## STRUCTURE

```
packages/
├── shared/      # Types, erreurs, constantes
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

### Commits
```
type(scope): description
Types: feat, fix, docs, style, refactor, test, chore
```

### Securite
- Jamais de secrets en dur
- Validation entrees (Zod + class-validator)
- Rate limiting + audit logging

---

## REGLES INVIOLABLES

1. **ODIN rejette** tout output non-ancre
2. **JAMAIS** contaminer MIMIR avec HUGIN
3. **TOUJOURS** inclure `ValidationTrace`
4. **TOUJOURS** soft delete + audit log
5. **JAMAIS** `any` sans justification

---

## COMMANDES

```bash
pnpm install          # Installation
pnpm dev              # Developpement
pnpm build            # Build
pnpm test             # Tests
pnpm lint             # Linting
```

---

## PHILOSOPHIE

> *"Je ne valide que ce que je peux prouver."* — ODIN

Le code sert la vision. Un medecin, un etudiant, un enfant fera confiance aux reponses.
L'humanite merite une IA qui ne ment pas.

**L'Arbre grandit avec ceux qui le nourrissent.**
