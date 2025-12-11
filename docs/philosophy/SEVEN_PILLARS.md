# Les Sept Piliers de YGGDRASIL

> _"La verite n'est pas une opinion, c'est une fondation."_

Ce document decrit en profondeur les sept piliers fondamentaux sur lesquels repose l'architecture YGGDRASIL. Chaque pilier est une contrainte architecturale inviolable qui guide toutes les decisions de conception.

---

## Pilier I : Veracite Absolue

### Principe

**Toute reponse doit etre ancree dans une source verifiable ou etre explicitement rejetee.**

YGGDRASIL ne "croit" pas, ne "suppose" pas, ne "devine" pas. Le systeme :
- Retourne une reponse **avec sources MIMIR** (confiance 100%)
- Retourne une hypothese **flaggee VOLVA** (confiance 50-99%)
- Retourne "Je ne sais pas" avec **transparence totale**

### Implementation Technique

```typescript
// packages/odin/src/validation.service.ts
interface ValidationResult {
  isValid: boolean;
  confidence: number;        // 0-100
  sources: Source[];         // MIMIR anchors required for isValid=true
  rejectionReason?: RejectionReason;
}

// Rejection si aucune source MIMIR
if (sources.filter(s => s.branch === 'MIMIR').length === 0) {
  return {
    isValid: false,
    confidence: 0,
    sources: [],
    rejectionReason: 'NO_SOURCE'
  };
}
```

### Metriques

| Metrique | Cible | Mesure |
|----------|-------|--------|
| Taux de hallucination | <1% | Audit manuel sur echantillon |
| Ancrage source | 100% | Automatise via ValidationTrace |
| Rejet explicite | 100% des cas sans source | Logs ODIN |

### Consequences Architecturales

1. **ODIN** est le gardien final - aucune reponse ne sort sans validation
2. **MIMIR** est la source de verite unique pour les faits verifies
3. Le systeme prefere **refuser** plutot que **mentir**

---

## Pilier II : Tracabilite Totale

### Principe

**Chaque decision, chaque reponse, chaque modification doit etre explicable et auditable.**

Aucune "boite noire". Un utilisateur doit pouvoir comprendre :
- Pourquoi cette reponse ?
- Quelles sources consultees ?
- Quel membre du conseil a dit quoi ?
- Pourquoi ce niveau de confiance ?

### Implementation Technique

```typescript
// packages/shared/src/types/validation.ts
interface ValidationTrace {
  requestId: string;
  timestamp: Date;

  // Phase 1: Intake
  intake: {
    originalQuery: string;
    classification: QueryClassification;
    durationMs: number;
  };

  // Phase 2: Routing
  routing: {
    selectedBranches: EpistemicBranch[];
    routingReason: string;
    durationMs: number;
  };

  // Phase 3: Branch consultation
  branches: {
    mimir?: { found: boolean; sources: Source[]; durationMs: number };
    volva?: { hypotheses: Hypothesis[]; durationMs: number };
    hugin?: { results: WebResult[]; filtered: number; durationMs: number };
  };

  // Phase 4: Council deliberation
  council: {
    members: CouncilMember[];
    responses: CouncilResponse[];
    challenges: LokiChallenge[];
    verdict: TyrVerdict;
    durationMs: number;
  };

  // Phase 5: Validation
  validation: {
    confidence: number;
    sources: Source[];
    isValid: boolean;
    rejectionReason?: RejectionReason;
  };

  // Phase 6: Memory
  memory: {
    factsExtracted: number;
    factsStored: number;
    durationMs: number;
  };

  totalDurationMs: number;
}
```

### Audit Trail

Chaque action est enregistree dans un journal immutable :

```typescript
// packages/munin/src/types/ledger.ts
interface KnowledgeLedgerEntry {
  timestamp: string;
  action: KnowledgeLedgerAction;
  fromState: MemoryState | null;
  toState: MemoryState;
  trigger: string;
  agent: string;
  reason: string;
  metadata?: Record<string, unknown>;
}
```

### Consequences Architecturales

1. **ValidationTrace** accompagne chaque reponse
2. **Audit logs** sur toutes les operations CRUD
3. **Shapley Attribution** pour responsabilite du conseil

---

## Pilier III : Separation Epistemique

### Principe

**Les connaissances verifiees, les hypotheses, et les donnees non-verifiees ne doivent JAMAIS se melanger.**

```
+------------------+------------------+------------------+
|      MIMIR       |      VOLVA       |      HUGIN       |
|   Confiance 100% |    50-99%        |     0-49%        |
|    VERIFIED      |     THEORY       |   UNVERIFIED     |
| arXiv, PubMed,   |   Preprints,     |   Web, News,     |
| ISO, RFC         |   Reviews        |   Forums         |
+------------------+------------------+------------------+
        |                  |                  |
        v                  v                  v
   AUCUNE CONTAMINATION - PROMOTION UNIQUEMENT SUR PREUVE
```

### Regles de Promotion

| De | Vers | Condition |
|----|------|-----------|
| HUGIN | VOLVA | Correlation avec 2+ sources VOLVA |
| VOLVA | MIMIR | Publication peer-reviewed + validation ODIN |
| MIMIR | DEPRECATED | Contradiction detectee + cascade invalidation |

### Implementation Technique

```typescript
// packages/shared/src/types/epistemic.ts
enum EpistemicBranch {
  MIMIR = 'MIMIR',   // 100% verified - arXiv, PubMed, ISO
  VOLVA = 'VOLVA',   // 50-99% theoretical - preprints, reviews
  HUGIN = 'HUGIN',   // 0-49% unverified - web, news
}

// packages/shared/src/constants/epistemic.ts
export const EPISTEMIC_THRESHOLDS = {
  MIMIR_MIN: 100,
  VOLVA_MIN: 50,
  VOLVA_MAX: 99,
  HUGIN_MAX: 49,
};
```

### Consequences Architecturales

1. **Bases de donnees separees** pour chaque branche
2. **Jamais de JOIN** entre MIMIR et HUGIN
3. **Pipeline de promotion** avec validation stricte

---

## Pilier IV : Memoire Vivante

### Principe

**La memoire n'est pas un simple stockage, c'est un systeme vivant qui evolue, se corrige, et apprend.**

Triple indexation :
- **Temporelle** : Quand un fait a ete appris/modifie
- **Semantique** : Similarite vectorielle (embeddings)
- **Causale** : Graphe de dependances entre faits

### Implementation Technique

```typescript
// packages/munin/src/knowledge-ledger.service.ts

// Knowledge Node avec velocite epistemique
interface KnowledgeNode {
  id: string;
  statement: string;
  currentState: MemoryState;
  epistemicBranch: EpistemicBranch;
  confidenceScore: number;
  epistemicVelocity: number;  // v_ε = Δκ/Δt
  priorityQueue: PriorityQueue;
  auditTrail: KnowledgeLedgerEntry[];
}

// Epistemic Velocity: mesure de stabilite
// v_ε(t) = (κ_t - κ_{t-1}) / Δt
// Haute velocite = fait instable = surveillance HOT queue
```

### Priority Queues

```typescript
export const PRIORITY_QUEUE_CONFIG = {
  HOT: {
    intervalMs: 3600000,    // 1 heure
    description: 'High epistemic velocity, frequent changes'
  },
  WARM: {
    intervalMs: 86400000,   // 24 heures
    description: 'Moderate velocity, daily review'
  },
  COLD: {
    intervalMs: 604800000,  // 7 jours
    description: 'Stable facts, weekly verification'
  }
};
```

### Consequences Architecturales

1. **PGVector** pour recherche semantique
2. **Knowledge Ledger** immutable
3. **HUGIN Watcher** pour surveillance proactive

---

## Pilier V : Reversibilite

### Principe

**Toute action doit pouvoir etre annulee. Aucune perte de donnees n'est acceptable.**

- Soft delete uniquement (jamais de DELETE physique)
- Checkpoints automatiques avant operations critiques
- Rollback disponible a tout moment

### Implementation Technique

```typescript
// Cascade Invalidation avec reversibilite
interface CascadeInvalidationResult {
  sourceNodeId: string;
  invalidatedCount: number;
  reviewScheduledCount: number;
  invalidatedNodes: string[];
  reviewScheduledNodes: string[];
  timestamp: Date;
  duration: number;
  // Rollback possible via audit trail
}

// Soft delete pattern
interface SoftDeletable {
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
}
```

### Checkpoints (En cours d'implementation)

```typescript
interface Checkpoint {
  id: string;
  timestamp: Date;
  type: 'MANUAL' | 'AUTO' | 'PRE_CASCADE';
  scope: 'FULL' | 'PARTIAL';
  nodes: string[];  // IDs des nodes captures
  metadata: Record<string, unknown>;
}
```

### Consequences Architecturales

1. **Audit trail** sur chaque entite
2. **Soft delete** systemique
3. **Checkpoints** avant cascade invalidation

---

## Pilier VI : Souverainete

### Principe

**L'utilisateur est proprietaire de ses donnees. Le code appartient a l'humanite.**

- Open source (MIT + Copyleft)
- Auto-hebergeable (Docker)
- Multi-provider (aucun vendor lock-in)
- Data locality (donnees restent locales)

### Implementation Technique

```typescript
// Multi-provider support
// packages/thing/src/adapters/

// Gemini (Google)
export class KvasirAdapter { /* Claude/Gemini */ }
export class BragiAdapter { /* Grok/Gemini */ }

// Groq (open models)
export class NornesAdapter { /* DeepSeek/Groq */ }
export class SagaAdapter { /* Llama/Groq */ }

// Adapters interchangeables
interface CouncilAdapter {
  query(input: string, context?: QueryContext): Promise<CouncilResponse>;
  getName(): CouncilMember;
  isAvailable(): Promise<boolean>;
}
```

### Deploiement

```yaml
# docker-compose.yml
services:
  heimdall:
    image: yggdrasil/heimdall:latest
  postgres:
    image: pgvector/pgvector:pg16
  redis:
    image: redis:7-alpine
```

### Consequences Architecturales

1. **Adapters abstraits** pour chaque provider LLM
2. **Configuration environnement** pour credentials
3. **Docker-compose** pour deploiement simple

---

## Pilier VII : Soutenabilite

### Principe

**Le systeme doit etre economiquement et ecologiquement viable.**

- Zero entrainement de modeles (utilise modeles existants)
- Serverless-ready (scale to zero)
- Cout proportionnel a l'usage
- Pas de GPU requis pour inference

### Implementation Technique

```typescript
// Caching agressif pour reduire appels API
// packages/shared/src/utils/cache.ts

// Rate limiting pour controler les couts
// packages/heimdall/src/app.module.ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 10 },
  { name: 'medium', ttl: 60000, limit: 100 },
  { name: 'long', ttl: 3600000, limit: 1000 },
]);

// Embeddings via API (pas de GPU local)
// packages/shared/src/embedding/embedding.service.ts
export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Utilise Gemini embedding API
    // ~0.0001$ per 1000 tokens
  }
}
```

### Metriques de Cout

| Operation | Cout estimatif |
|-----------|----------------|
| Query simple | ~$0.01 |
| Query avec conseil complet | ~$0.05 |
| Embedding (1000 tokens) | ~$0.0001 |
| Stockage (1GB/mois) | ~$0.02 |

### Consequences Architecturales

1. **Pas d'entrainement** = pas de cout GPU
2. **Caching Redis** pour deduplication
3. **Serverless functions** pour scale-to-zero

---

## Resume

| Pilier | Gardien | Mecanisme |
|--------|---------|-----------|
| I. Veracite | ODIN | ValidationResult.isValid |
| II. Tracabilite | Tous | ValidationTrace |
| III. Separation | RATATOSK | EpistemicBranch enum |
| IV. Memoire | MUNIN | KnowledgeLedger |
| V. Reversibilite | MUNIN | Soft delete + Checkpoints |
| VI. Souverainete | Config | Adapters + Docker |
| VII. Soutenabilite | HEIMDALL | Rate limiting + Caching |

---

_"Ces piliers ne sont pas des suggestions. Ce sont des contraintes. Violer un pilier, c'est trahir la vision."_

_Derniere mise a jour : Decembre 2025_
