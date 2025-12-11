# Les Sept Lois de YGGDRASIL

> _"Les lois ne sont pas des restrictions, ce sont des promesses."_

Ce document définit les sept lois fondamentales qui régissent le comportement d'YGGDRASIL. Ces lois sont des engagements inviolables envers les utilisateurs et l'humanité.

---

## Loi I : YGGDRASIL Ne Ment Jamais

### Énoncé

**Le système ne produira jamais une affirmation fausse présentée comme vraie.**

YGGDRASIL préfère :
- Dire "Je ne sais pas" plutôt que deviner
- Citer ses sources plutôt qu'affirmer
- Exprimer son incertitude plutôt que simuler la confiance

### Implémentation

```typescript
// packages/odin/src/validation.service.ts
interface OdinVerdict {
  isValid: boolean;
  confidence: number;
  response: string;
  sources: Source[];
  // Si aucune source MIMIR, rejet obligatoire
  rejectionReason?: 'NO_SOURCE' | 'INSUFFICIENT_CONFIDENCE' | 'CONTRADICTION';
}

// Le mensonge par omission est aussi un mensonge
// ODIN ne cache jamais les limitations du système
```

### Conséquences Pratiques

1. **Aucune hallucination tolérée** — Cible <1%
2. **Sources obligatoires** — Chaque fait cité
3. **Transparence sur les limites** — "Je ne sais pas" est une réponse valide

### Ce que cela signifie pour l'utilisateur

Quand YGGDRASIL dit quelque chose, c'est vérifiable. Quand il ne sait pas, il le dit. Un médecin peut faire confiance aux réponses pour ses patients.

---

## Loi II : Toujours Montrer le Raisonnement

### Énoncé

**Chaque décision doit être explicable et compréhensible par un humain.**

Pas de "boîte noire". L'utilisateur peut toujours demander :
- Pourquoi cette réponse ?
- Quelles sources consultées ?
- Quel membre du conseil a dit quoi ?
- Pourquoi ce niveau de confiance ?

### Implémentation

```typescript
// packages/shared/src/types/validation.ts
interface ValidationTrace {
  requestId: string;
  timestamp: Date;

  // Chaque phase documentée
  intake: IntakeTrace;
  routing: RoutingTrace;
  branches: BranchConsultation;
  council: CouncilDeliberation;
  validation: ValidationResult;
  memory: MemoryTrace;

  // Temps d'exécution total
  totalDurationMs: number;
}

// Chaque réponse accompagnée de sa trace
interface YggdrasilResponse {
  answer: string;
  sources: Source[];
  confidence: number;
  trace: ValidationTrace;  // TOUJOURS présent
}
```

### Audit Accessible

```typescript
// L'utilisateur peut demander l'explication complète
GET /api/query/{requestId}/trace

// Retourne la trace complète avec :
// - Classification de la question
// - Branches consultées
// - Réponses du conseil
// - Processus de validation
// - Faits extraits et stockés
```

### Ce que cela signifie pour l'utilisateur

Vous n'avez jamais à "faire confiance aveuglément". Chaque réponse peut être auditée. Le raisonnement est transparent.

---

## Loi III : Prouvé ≠ Supposé ≠ Bruit

### Énoncé

**Les connaissances vérifiées, les hypothèses, et les données non-vérifiées ne doivent JAMAIS se mélanger.**

La séparation épistémique est sacrée :

| Branche | Confiance | Sources | Usage |
|---------|-----------|---------|-------|
| MIMIR | 100% | arXiv, PubMed, ISO, RFC | Faits établis |
| VOLVA | 50-99% | Preprints, reviews, théories | Hypothèses flaggées |
| HUGIN | 0-49% | Web, news, forums | Information brute |

### Implémentation

```typescript
// packages/shared/src/types/epistemic.ts
enum EpistemicBranch {
  MIMIR = 'MIMIR',   // Vérité prouvée
  VOLVA = 'VOLVA',   // Hypothèse raisonnable
  HUGIN = 'HUGIN',   // Bruit potentiel
}

// JAMAIS de contamination croisée
// Une info HUGIN ne peut pas devenir MIMIR directement
// Seule la preuve permet la promotion
```

### Règles de Promotion

```
HUGIN → VOLVA : Corrélation avec 2+ sources VOLVA
VOLVA → MIMIR : Publication peer-reviewed + validation ODIN
MIMIR → DEPRECATED : Contradiction détectée + cascade invalidation
```

### Ce que cela signifie pour l'utilisateur

Quand YGGDRASIL dit "selon MIMIR", c'est un fait vérifié. Quand il dit "selon VOLVA", c'est une hypothèse. Quand il dit "selon HUGIN", c'est du web brut. Vous savez toujours à quoi vous fier.

---

## Loi IV : Droit à l'Oubli Sélectif

### Énoncé

**L'utilisateur a le contrôle total sur ses données et peut demander leur suppression.**

Le système respecte :
- Le RGPD et équivalents internationaux
- Le droit à l'effacement
- Le droit à la portabilité
- La minimisation des données

### Implémentation

```typescript
// packages/munin/src/memory.service.ts
interface UserDataRights {
  // Droit à l'oubli
  deleteUserData(userId: string): Promise<DeletionResult>;

  // Droit à la portabilité
  exportUserData(userId: string): Promise<UserDataExport>;

  // Droit d'accès
  getUserData(userId: string): Promise<UserDataView>;

  // Droit de rectification
  rectifyUserData(userId: string, corrections: Correction[]): Promise<void>;
}

// Soft delete avec audit trail
interface SoftDeletable {
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
  // Les données peuvent être restaurées si erreur
}
```

### Granularité

```typescript
// L'utilisateur peut supprimer :
// - Une conversation spécifique
// - Toutes ses données
// - Des faits spécifiques extraits de ses conversations
// - Son profil complet

DELETE /api/user/data              // Tout supprimer
DELETE /api/user/conversations/:id // Conversation spécifique
DELETE /api/user/facts/:factId     // Fait spécifique
```

### Ce que cela signifie pour l'utilisateur

Vos données vous appartiennent. Vous pouvez les voir, les exporter, les corriger, les supprimer. YGGDRASIL ne garde que ce que vous autorisez.

---

## Loi V : Les Données Appartiennent au Créateur

### Énoncé

**L'utilisateur est propriétaire de ses données. YGGDRASIL n'est qu'un gardien temporaire.**

Principes :
- Aucune vente de données
- Aucun partage sans consentement explicite
- Stockage local préféré
- Chiffrement end-to-end optionnel

### Implémentation

```typescript
// Déploiement auto-hébergé
// docker-compose.yml
services:
  heimdall:
    image: yggdrasil/heimdall:latest
    environment:
      # Toutes les données restent sur votre serveur
      DATABASE_URL: postgres://localhost/yggdrasil
      REDIS_URL: redis://localhost:6379

  postgres:
    image: pgvector/pgvector:pg16
    volumes:
      - ./data:/var/lib/postgresql/data  # Vos données, votre disque
```

### Souveraineté des Données

```typescript
// Configuration de localisation
interface DataSovereigntyConfig {
  storage: 'local' | 'encrypted-cloud';
  jurisdiction: 'EU' | 'US' | 'CH' | 'self-hosted';
  retention: RetentionPolicy;
  sharing: 'none' | 'anonymized-research' | 'explicit-consent';
}

// Par défaut : local, aucun partage
const DEFAULT_SOVEREIGNTY: DataSovereigntyConfig = {
  storage: 'local',
  jurisdiction: 'self-hosted',
  retention: { type: 'user-controlled' },
  sharing: 'none',
};
```

### Ce que cela signifie pour l'utilisateur

Vos conversations, vos faits, vos préférences ne quittent jamais votre contrôle. Vous pouvez tout héberger vous-même. Aucune corporation ne monétise vos données.

---

## Loi VI : Ne Consommer que le Nécessaire

### Énoncé

**Le système doit être économiquement et écologiquement responsable.**

YGGDRASIL :
- N'entraîne pas de modèles (utilise les existants)
- Optimise les appels API (caching, batching)
- Scale to zero quand non utilisé
- Privilégie l'efficacité à la puissance brute

### Implémentation

```typescript
// packages/shared/src/utils/cache.ts
// Caching agressif pour réduire les appels API
class QueryCache {
  private cache: Map<string, CachedResponse>;

  async get(query: string): Promise<CachedResponse | null> {
    const hash = this.hashQuery(query);
    const cached = this.cache.get(hash);

    if (cached && !this.isExpired(cached)) {
      // Économise un appel API
      this.metrics.cacheHit++;
      return cached;
    }
    return null;
  }
}

// Rate limiting pour contrôler les coûts
// packages/heimdall/src/app.module.ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 10 },
  { name: 'medium', ttl: 60000, limit: 100 },
  { name: 'long', ttl: 3600000, limit: 1000 },
]);
```

### Métriques de Consommation

```typescript
// Tableau de bord de consommation
interface ConsumptionMetrics {
  apiCalls: {
    total: number;
    cached: number;      // % économisé
    costUSD: number;
  };
  compute: {
    cpuHours: number;
    memoryGB: number;
  };
  storage: {
    totalGB: number;
    growthRate: number;
  };
}

// Alertes sur surconsommation
if (metrics.apiCalls.costUSD > budget.daily) {
  alert('Budget journalier dépassé');
  throttle();
}
```

### Ce que cela signifie pour l'utilisateur

YGGDRASIL ne gaspille pas. Les coûts sont prévisibles. L'empreinte écologique est minimisée. Pas de GPU monstre pour fonctionner.

---

## Loi VII : Le Code Appartient à l'Humanité

### Énoncé

**YGGDRASIL est et restera open-source pour toujours.**

Licences :
- **MIT** pour le code principal (liberté maximale)
- **Copyleft** pour les améliorations (elles restent publiques)
- **Documentation libre** (CC-BY)

### Implémentation

```
LICENSE
├── MIT License (packages/*)
│   Permission is hereby granted, free of charge, to any person
│   obtaining a copy of this software...
│
└── Copyleft addendum
    Any derivative work that improves the validation system
    must be contributed back to the community.
```

### Transparence Totale

```typescript
// Tout est auditable
// GitHub : https://github.com/yggdrasil-ai/yggdrasil

// Structure publique
packages/
├── shared/      # Types, utilities
├── heimdall/    # Gateway
├── ratatosk/    # Routing
├── mimir/       # Verified knowledge
├── volva/       # Hypotheses
├── hugin/       # Web search
├── thing/       # Council
├── odin/        # Validation
└── munin/       # Memory

// Aucun code secret, aucune backdoor
// Les audits de sécurité sont publics
```

### Ce que cela signifie pour l'utilisateur

Vous pouvez lire chaque ligne de code. Vous pouvez contribuer. Vous pouvez forker et adapter. Le projet survivra à ses créateurs car il appartient à tous.

---

## Résumé des Lois

| Loi | Énoncé | Gardien |
|-----|--------|---------|
| I | Ne ment jamais | ODIN |
| II | Montre le raisonnement | ValidationTrace |
| III | Sépare prouvé/supposé/bruit | RATATOSK |
| IV | Droit à l'oubli | MUNIN |
| V | Données au créateur | Config |
| VI | Consomme le nécessaire | HEIMDALL |
| VII | Code à l'humanité | LICENSE |

---

## Violations et Conséquences

### Qu'est-ce qu'une violation ?

Une violation se produit quand le système :
- Présente une information non-sourcée comme fait (Loi I)
- Retourne une réponse sans trace (Loi II)
- Mélange MIMIR et HUGIN (Loi III)
- Refuse une demande de suppression légitime (Loi IV)
- Partage des données sans consentement (Loi V)
- Consomme excessivement sans raison (Loi VI)
- Ferme le code source (Loi VII)

### Conséquences

1. **Détection automatique** — Monitoring continu des violations
2. **Alerte immédiate** — Notification aux administrateurs
3. **Correction prioritaire** — Bug fix en urgence
4. **Post-mortem public** — Transparence sur l'incident
5. **Amélioration système** — Renforcement des garde-fous

---

## Engagement

> _"Ces lois ne sont pas des idéaux. Ce sont des promesses.
> Violer une loi, c'est trahir les utilisateurs qui nous font confiance."_

Chaque contributeur YGGDRASIL s'engage à respecter ces lois. Chaque PR est évaluée à leur aune. Chaque décision architecturale les honore.

---

_"L'Arbre ne ment pas. L'Arbre ne cache pas. L'Arbre appartient à tous."_

_Dernière mise à jour : Décembre 2025_
