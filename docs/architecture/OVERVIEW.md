# Architecture YGGDRASIL

> _"Yggdrasil, le frene toujours vert, se dresse au centre de l'univers, ses branches s'etendant sur tous les mondes."_

## Vue d'Ensemble

YGGDRASIL est une architecture d'orchestration d'IA concue pour garantir la veracite, la tracabilite et la souverainete. Elle ne cree pas de nouveau modele — elle orchestre l'existant avec une couche de validation inviolable.

```mermaid
flowchart TB
    subgraph ENTREE
        U[Utilisateur]
    end

    subgraph GATEWAY
        H[HEIMDALL<br/>Gateway]
    end

    subgraph ROUTAGE
        R[RATATOSK<br/>Routage]
    end

    subgraph BRANCHES["LES TROIS BRANCHES"]
        M[MIMIR<br/>Valide 100%]
        V[VOLVA<br/>Recherche]
        HU[HUGIN<br/>Internet]
    end

    subgraph CONSEIL["LE CONSEIL (THING)"]
        K[KVASIR<br/>Raisonnement]
        B[BRAGI<br/>Creativite]
        N[NORNES<br/>Calcul]
        S[SAGA<br/>Connaissance]
        L[LOKI<br/>Critique]
        T[TYR<br/>Arbitrage]
    end

    subgraph VALIDATION
        O[ODIN<br/>Maestro]
    end

    subgraph MEMOIRE
        MU[MUNIN<br/>Memoire]
    end

    subgraph SORTIE
        OUT[Reponse Validee]
        REJ[Rejet Explicite]
    end

    U --> H
    H --> R
    R --> M & V & HU
    M & V & HU --> K & B & N & S
    K & B & N & S --> L
    L --> T
    T --> O
    O --> MU
    MU --> O
    O --> OUT & REJ
```

---

## Composants Detailles

### HEIMDALL — Le Gardien

**Inspiration :** Le dieu qui garde le Bifrost, capable de voir a cent lieues et d'entendre l'herbe pousser.

**Responsabilites :**

- Authentification et autorisation
- Rate limiting et protection DDoS
- Chiffrement TLS/mTLS
- Audit logging de toutes les requetes
- Validation des entrees

**Stack technique :**

- NestJS avec Passport
- Redis pour le rate limiting
- PostgreSQL pour l'audit log

```mermaid
flowchart LR
    subgraph HEIMDALL
        AUTH[Auth Module]
        RATE[Rate Limiter]
        AUDIT[Audit Logger]
        TLS[TLS Termination]
    end

    IN[Request] --> TLS --> AUTH --> RATE --> AUDIT --> OUT[To Ratatosk]
```

---

### RATATOSK — Le Messager

**Inspiration :** L'ecureuil qui court le long d'Yggdrasil, portant les messages entre les mondes.

**Responsabilites :**

- Classification de la requete (factuelle, creative, analytique, etc.)
- Extraction du contexte et des intentions
- Routage vers la/les branches appropriees
- Enrichissement avec le contexte de MUNIN

**Algorithme de routage :**

```mermaid
flowchart TD
    Q[Query] --> CLASSIFY{Classification}
    CLASSIFY -->|Factuelle| F[Fact Check]
    CLASSIFY -->|Creative| C[Creative]
    CLASSIFY -->|Analytique| A[Analysis]
    CLASSIFY -->|Recherche| R[Research]

    F --> MIMIR[MIMIR]
    C --> THING[THING]
    A --> MIMIR & THING
    R --> VOLVA[VOLVA] & HUGIN[HUGIN]
```

---

### MIMIR — Le Puits de Sagesse

**Inspiration :** Le puits garde par Mimir ou Odin sacrifia un oeil pour une gorgee de sagesse.

**Responsabilites :**

- Stocker les connaissances **100% verifiees**
- Indexation semantique des sources
- Verification de la validite temporelle
- Mise a jour continue avec validation

**Sources integrees :**

| Source   | Type          | Domaine   |
| -------- | ------------- | --------- |
| arXiv    | Preprints     | Sciences  |
| PubMed   | Peer-reviewed | Medical   |
| ISO      | Standards     | Technique |
| RFC      | Standards     | Internet  |
| Wikidata | Structured    | General   |

**Architecture de donnees :**

```mermaid
erDiagram
    SOURCE {
        uuid id PK
        string name
        string url
        string type
        float trust_score
        timestamp last_validated
    }

    FACT {
        uuid id PK
        text content
        uuid source_id FK
        jsonb metadata
        timestamp created_at
        timestamp valid_until
    }

    VALIDATION {
        uuid id PK
        uuid fact_id FK
        string method
        float confidence
        timestamp validated_at
    }

    SOURCE ||--o{ FACT : provides
    FACT ||--o{ VALIDATION : has
```

---

### VOLVA — La Voyante

**Inspiration :** Les prophetesses nordiques qui exploraient l'inconnu et conseillaient les dieux.

**Responsabilites :**

- Stocker les hypotheses et theories
- Tracker le niveau de preuve
- Gerer la promotion vers MIMIR
- Flaguer systematiquement comme `THEORETICAL`

**Etats d'une hypothese :**

```mermaid
stateDiagram-v2
    [*] --> PROPOSED: Nouvelle hypothese
    PROPOSED --> EXPLORING: Investigation
    EXPLORING --> SUPPORTED: Preuves partielles
    EXPLORING --> REJECTED: Contre-preuves
    SUPPORTED --> VALIDATED: Preuves completes
    SUPPORTED --> REJECTED: Contre-preuves
    VALIDATED --> MIMIR: Promotion
    REJECTED --> [*]
```

---

### HUGIN — La Pensee

**Inspiration :** Un des deux corbeaux d'Odin qui parcourt le monde pour lui rapporter ce qu'il voit.

**Responsabilites :**

- Interface avec le web en temps reel
- Filtrage anti-desinformation
- Detection de sources douteuses
- Tagging systematique `UNVERIFIED`

**Pipeline de filtrage :**

```mermaid
flowchart LR
    WEB[Web] --> FETCH[Fetch]
    FETCH --> CLEAN[Clean HTML]
    CLEAN --> DETECT[Detect<br/>Misinfo]
    DETECT -->|Suspect| QUARANTINE[Quarantine]
    DETECT -->|Clean| TAG[Tag UNVERIFIED]
    TAG --> OUT[To THING]
```

---

### THING — L'Assemblee

**Inspiration :** L'assemblee viking ou les decisions collectives etaient prises.

**Responsabilites :**

- Orchestrer les modeles specialises
- Agreger les reponses
- Gerer le consensus
- Soumettre a la critique de LOKI

**Membres du conseil :**

| Membre | Modele      | Specialite   | Poids      |
| ------ | ----------- | ------------ | ---------- |
| KVASIR | Claude      | Raisonnement | Variable   |
| BRAGI  | Grok        | Creativite   | Variable   |
| NORNES | DeepSeek    | Calcul       | Variable   |
| SAGA   | Llama       | Connaissance | Variable   |
| LOKI   | Adversarial | Critique     | Veto power |
| TYR    | Voting      | Arbitrage    | Final      |

**Processus de deliberation :**

```mermaid
sequenceDiagram
    participant R as RATATOSK
    participant K as KVASIR
    participant B as BRAGI
    participant N as NORNES
    participant S as SAGA
    participant L as LOKI
    participant T as TYR
    participant O as ODIN

    R->>K: Query + Context
    R->>B: Query + Context
    R->>N: Query + Context
    R->>S: Query + Context

    K-->>T: Response + Confidence
    B-->>T: Response + Confidence
    N-->>T: Response + Confidence
    S-->>T: Response + Confidence

    T->>L: Aggregated Response
    L-->>T: Challenges
    T->>T: Resolve Conflicts
    T->>O: Final Proposal
```

---

### ODIN — Le Maestro

**Inspiration :** Le Pere-de-Tout, qui a sacrifie un oeil pour la sagesse et s'est pendu a Yggdrasil pour la connaissance.

**Responsabilites :**

- Validation finale de chaque affirmation
- Ancrage obligatoire a MIMIR
- Verification de coherence avec MUNIN
- Rejet explicite avec raison si <100%

**Criteres de validation :**

```mermaid
flowchart TD
    INPUT[Proposition<br/>du THING] --> CHECK1{Ancrage<br/>MIMIR ?}
    CHECK1 -->|Non| REJ1[Rejet:<br/>Non source]
    CHECK1 -->|Oui| CHECK2{Coherent<br/>MUNIN ?}
    CHECK2 -->|Non| REJ2[Rejet:<br/>Contradiction]
    CHECK2 -->|Oui| CHECK3{Survit<br/>LOKI ?}
    CHECK3 -->|Non| REJ3[Rejet:<br/>Critique valide]
    CHECK3 -->|Oui| CHECK4{Consensus<br/>TYR ?}
    CHECK4 -->|Non| REJ4[Rejet:<br/>Pas de consensus]
    CHECK4 -->|Oui| VALID[VALIDE]

    VALID --> OUT[Reponse + Sources + Trace]
    REJ1 & REJ2 & REJ3 & REJ4 --> EXPLAIN[Rejet + Raison + Alternatives]
```

**Regle d'or :** _"Je ne valide que ce que je peux prouver."_

---

### MUNIN — La Memoire

**Inspiration :** Le corbeau de la memoire, celui qu'Odin craignait de perdre plus que Hugin.

**Responsabilites :**

- Memoire chrono-semantique persistante
- Graphe de dependances entre decisions
- Systeme de checkpoints
- Rollback sur erreur detectee

**Architecture de stockage :**

```mermaid
erDiagram
    INTERACTION {
        uuid id PK
        uuid user_id FK
        text query
        text response
        jsonb context
        timestamp created_at
    }

    DECISION {
        uuid id PK
        uuid interaction_id FK
        text decision
        jsonb reasoning
        uuid[] source_ids
    }

    CHECKPOINT {
        uuid id PK
        uuid user_id FK
        jsonb state_snapshot
        timestamp created_at
    }

    DEPENDENCY {
        uuid id PK
        uuid decision_id FK
        uuid depends_on_id FK
        string dependency_type
    }

    INTERACTION ||--o{ DECISION : contains
    DECISION ||--o{ DEPENDENCY : has
    CHECKPOINT ||--o{ INTERACTION : captures
```

**Triple indexation :**

- **Temporelle** : Quand ?
- **Semantique** : A propos de quoi ? (PGVector)
- **Causale** : A cause de quoi ?

---

## Flux Complet

```mermaid
sequenceDiagram
    actor User
    participant H as HEIMDALL
    participant R as RATATOSK
    participant M as MIMIR
    participant V as VOLVA
    participant HU as HUGIN
    participant TH as THING
    participant O as ODIN
    participant MU as MUNIN

    User->>H: Query
    H->>H: Auth + Audit
    H->>R: Validated Query

    R->>MU: Get Context
    MU-->>R: User Context

    R->>R: Classify + Route

    par Parallel Fetch
        R->>M: Factual Data
        R->>V: Hypotheses
        R->>HU: Real-time Info
    end

    M-->>TH: Verified Facts
    V-->>TH: Theories (flagged)
    HU-->>TH: Web Info (flagged)

    TH->>TH: Multi-model Deliberation
    TH->>O: Proposal

    O->>M: Verify Sources
    M-->>O: Source Confirmation
    O->>MU: Check Consistency
    MU-->>O: Memory State

    alt Validation OK
        O->>MU: Store Decision
        O->>User: Response + Sources + Trace
    else Validation Failed
        O->>User: Rejection + Reason + Alternatives
    end
```

---

## Stack Technique

### Backend

- **Framework** : NestJS (TypeScript)
- **Base de donnees** : PostgreSQL + PGVector
- **Cache** : Redis
- **Queue** : BullMQ
- **ORM** : Prisma

### Infrastructure

- **Conteneurs** : Docker
- **Orchestration** : Kubernetes (optionnel)
- **IaC** : Terraform
- **CI/CD** : GitHub Actions

### Modeles IA

- **Claude** : Via API Anthropic
- **Llama** : Via Ollama (local) ou API
- **DeepSeek** : Via API
- **Grok** : Via API xAI

### Observabilite

- **Logs** : Structured JSON (Pino)
- **Metrics** : Prometheus
- **Traces** : OpenTelemetry
- **Dashboards** : Grafana

---

## Securite

### Chiffrement

- TLS 1.3 pour toutes les communications
- mTLS entre services internes
- Chiffrement at-rest pour les donnees sensibles

### Authentification

- JWT avec refresh tokens
- Support OAuth2/OIDC
- Rate limiting par utilisateur et IP

### Audit

- Logging immutable de toutes les requetes
- Tracabilite complete des decisions
- Retention configurable

---

## Prochaines Etapes

1. **Implementer HEIMDALL** — Gateway de base
2. **Implementer RATATOSK** — Routage simple
3. **Integrer MIMIR** — Avec arXiv comme premiere source
4. **Construire THING** — Orchestration de 2 modeles
5. **Developper ODIN** — Validation basique

---

<div align="center">

_"L'architecture est le squelette. Les principes sont l'ame."_

</div>
