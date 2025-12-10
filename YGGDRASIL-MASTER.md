# 🌳 YGGDRASIL — MASTER DOCUMENTATION

> **Document de Référence Complet pour Claude Code**
> *Synthèse du dialogue inter-IA (Claude Opus × Gemini 2.5 Pro × Architecte Humain)*
> *Version 2.0 — AGI Épistémique*

---

## 📋 NAVIGATION RAPIDE

| Section | Description | Priorité Lecture |
|---------|-------------|------------------|
| [1. CONTEXTE & ORIGINE](#1-contexte--origine) | Qui, pourquoi, genèse | 🔴 Essentiel |
| [2. VISION & PHILOSOPHIE](#2-vision--philosophie) | Principes fondateurs | 🔴 Essentiel |
| [3. ARCHITECTURE v1.0](#3-architecture-v10) | Composants de base | 🔴 Essentiel |
| [4. ÉVOLUTION v2.0 (AGI)](#4-évolution-v20-agi) | Nouvelles capacités | 🟡 Important |
| [5. FONDEMENTS MATHÉMATIQUES](#5-fondements-mathématiques) | Formalisations | 🟢 Référence |
| [6. SPÉCIFICATIONS TECHNIQUES](#6-spécifications-techniques) | Implémentation | 🔴 Essentiel |
| [7. ROADMAP & TÂCHES](#7-roadmap--tâches) | Plan d'action | 🟡 Important |
| [8. STANDARDS DE CODE](#8-standards-de-code) | Conventions | 🔴 Essentiel |

---

# 1. CONTEXTE & ORIGINE

## 1.1 L'Architecte

**Julien Gelée** (pseudo: Krigs)
- Fondateur d'**Alixia** — SaaS suisse d'automatisation marketing digital
- Vision : Entrepreneur tech européen focalisé sur la souveraineté numérique et l'IA éthique
- Positionnement : "L'horlogerie digitale suisse" appliquée au logiciel

## 1.2 Évolution du Nom

| Étape | Nom | Raison du changement |
|-------|-----|---------------------|
| 1 | **ODIN** | Trop générique, conflits, connotation guerrière |
| 2 | **AEGIS** | Trop acronyme, perte de la mythologie |
| 3 | **YGGDRASIL** | ✅ Parfait : Arbre-Monde connectant les 9 royaumes |

**Pourquoi YGGDRASIL ?**
- Arbre cosmique de la mythologie nordique
- Racines dans le puits de Mímir (sagesse)
- Système vivant nourri par la communauté
- Métaphore de la connaissance interconnectée

## 1.3 La Question Fondatrice à Yann LeCun

Avant de construire, l'architecte a posé cette question philosophique à LeCun :

> *"Étant donné votre position selon laquelle une véritable AGI nécessite un apprentissage autonome de modèle du monde plutôt que de grands modèles de langage, comment évaluez-vous le potentiel d'une 'société de modèles spécialisés' coordonnée par un contrôleur central qui :*
>
> *1. Sépare strictement les connaissances validées, la recherche exploratoire et les données Internet pour éviter la contamination épistémique*
>
> *2. Ne délivre que des réponses ancrées à des faits formellement vérifiés (rejetant même 99,9% de confiance si invérifiable)*
>
> *3. Maintient une mémoire chrono-sémantique persistante de toutes les interactions ?*
>
> *Pensez-vous qu'une telle architecture pourrait constituer un chemin de transition vers l'AGI, complémentaire aux agents avec modèles du monde auto-apprenants ?"*

**Cette question EST l'essence de YGGDRASIL.**

## 1.4 Complémentarité avec JEPA

| Aspect | JEPA (LeCun) | YGGDRASIL |
|--------|--------------|-----------|
| Approche | Modèle du monde auto-supervisé | Orchestration de spécialistes |
| Apprentissage | Apprend sa propre représentation | Mutualise les pré-entraînements |
| Échelle | Agent unifié unique | Consortium coordonné |
| Horizon | 10-20 ans | Réalisable maintenant |
| Énergie | Entraînement massif | Zéro entraînement |
| Vérifiabilité | Émergente | Architecturée |

**Thèse** : YGGDRASIL = "système cognitif externe" pendant que JEPA mûrit. Quand un vrai modèle du monde émergera, il deviendra membre du Conseil THING.

---

# 2. VISION & PHILOSOPHIE

## 2.1 Le Problème Fondamental

Les LLM optimisent la **vraisemblance** :
$$P(x_t|x_{<t}) \rightarrow \max$$

Mais cela n'a **aucun rapport** avec la vérité factuelle.

**Conséquences** :
- 20-30% d'hallucinations
- Opacité (aucune responsabilité)
- Amnésie (reset chaque session)
- Dépendance (vendor lock-in)

## 2.2 La Solution YGGDRASIL

**Principe** : "Vérifié + sources" OU "Je ne sais pas"

**Jamais** "probablement vrai"

| Approche Actuelle | Approche YGGDRASIL |
|-------------------|---------------------|
| "Probablement vrai" | "Vérifié + sources" ou "Je ne sais pas" |
| Reset chaque session | Mémoire chrono-sémantique persistante |
| Mélange opaque des sources | Séparation stricte : Validé/Recherche/Internet |
| Modèle monolithique géant | Consortium de spécialistes orchestré |
| Corporations privées | Open-source, auto-hébergeable, fédérable |
| Entraîner toujours plus | Mutualiser l'existant |

## 2.3 Les Sept Piliers (Principes Intransgressibles)

```
1. VÉRACITÉ ABSOLUE
   "Jamais de probabilité. Certitude ou silence."

2. TRAÇABILITÉ TOTALE
   "Chaque pensée a une origine. Chaque décision a une trace."

3. SÉPARATION ÉPISTÉMIQUE
   "Savoir, hypothèse, bruit ne se mélangent jamais."

4. MÉMOIRE VIVANTE
   "L'intelligence sans mémoire n'est que réflexe."

5. RÉVERSIBILITÉ
   "Aucune erreur n'est définitive."

6. SOUVERAINETÉ
   "Les données de l'humanité appartiennent à l'humanité."

7. SOUTENABILITÉ
   "L'intelligence qui détruit sa planète n'est pas intelligente."
```

## 2.4 Les Sept Lois (Règles Impératives)

```python
# LOI 1 : Primauté de la Vérité
if confidence < 1.0 and not anchored_in_verified_source:
    return Response("Je ne sais pas", reason=explanation)

# LOI 2 : Transparence Absolue
for each response:
    include complete_trace {
        sources,
        reasoning_paths,
        models_involved,
        intermediate_decisions
    }

# LOI 3 : Séparation du Savoir
NEVER mix:
    - MÍMIR (prouvé) with VÖLVA (hypothèse)
    - VÖLVA with HUGIN (bruit)
    - HUGIN with MÍMIR

# LOI 4 : Oubli Sélectif
if information_invalidated:
    propagate_invalidation(all_derived_decisions)
    mark_obsolete()
    notify_affected_users()

# LOI 5 : Souveraineté des Données
ALL personal_data:
    - REMAINS under user_jurisdiction
    - CAN be exported anytime
    - CAN be permanently_deleted
    - NEVER sold or shared

# LOI 6 : Humilité Computationnelle
for each request:
    USE minimum_necessary_resources
    REPORT consumption (tokens, estimated_energy)
    PREFER local_models when relevant

# LOI 7 : Ouverture Perpétuelle
YGGDRASIL code:
    - IS AND WILL REMAIN open-source
    - CANNOT be closed, patented, or privatized
    - BELONGS to humanity
```

---

# 3. ARCHITECTURE v1.0

## 3.1 Vue d'Ensemble

```
MONDE → HEIMDALL → RATATOSK → [MÍMIR|VÖLVA|HUGIN] → THING → ODIN → MUNIN → RÉPONSE
```

## 3.2 Les 8 Composants (Mythologie Nordique)

| Composant | Rôle | Inspiration Nordique |
|-----------|------|---------------------|
| **HEIMDALL** | Gateway (auth, rate limit, audit) | Gardien du Bifröst qui voit et entend tout |
| **RATATOSK** | Routing (classification, extraction) | Écureuil messager parcourant l'arbre |
| **MÍMIR** | Branche Validée (savoir 100%) | Puits de sagesse où Odin sacrifia son œil |
| **VÖLVA** | Branche Recherche (hypothèses) | Voyante explorant l'inconnu |
| **HUGIN** | Branche Internet (info non vérifiée) | "Pensée" - corbeau explorateur d'Odin |
| **THING** | Consortium (délibération multi-modèles) | Assemblée où les dieux décident |
| **ODIN** | Maestro (validation finale, synthèse) | Le Père-de-Tout, celui qui sait |
| **MUNIN** | Mémoire (stockage chrono-sémantique) | "Mémoire" - l'autre corbeau d'Odin |

## 3.3 Conseil THING — Les 7 Membres

| Membre | Rôle | Modèle | Inspiration |
|--------|------|--------|-------------|
| **KVASIR** | Raisonnement profond | Claude | Le sage qui pense longuement |
| **BRAGI** | Créativité, éloquence | Grok | Le poète qui trouve les mots |
| **NORNES** | Calcul, logique formelle | DeepSeek | Tisseuses du destin logique |
| **SAGA** | Connaissance générale | Llama | La conteuse qui sait tout |
| **SÝN** | Vision multimodale | Gemini | La gardienne qui voit tout |
| **LOKI** | Critique adversariale | Red team | Le trompeur qui doute |
| **TYR** | Arbitrage, consensus | Système de vote | Le juge qui tranche |

> **Note** : SÝN remplace HEIMDALL dans le conseil pour éviter le conflit de nommage avec le Gateway.

## 3.4 Branches Épistémiques

```
                    MÍMIR (τ = 1.0)
                    Savoir Absolu
                         ▲
                         │ π₂ (publication peer-reviewed + réplication)
                         │
                    VÖLVA (0.5 ≤ τ < 1.0)
                    Hypothèses Scientifiques
                         ▲
                         │ π₁ (peer review OU sources multiples)
                         │
                    HUGIN (τ < 0.5)
                    Information Brute
```

**Règle Absolue** : La contamination entre branches est **INTERDITE**.

## 3.5 Flux de Traitement

```
┌─────────────────────────────────────────────────────────────────┐
│                         REQUÊTE                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  HEIMDALL                                                        │
│  • Authentification JWT                                          │
│  • Rate limiting                                                 │
│  • Audit logging                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  RATATOSK                                                        │
│  • Classification du domaine                                     │
│  • Détection d'intention                                         │
│  • Extraction d'entités                                          │
│  • Routage vers branche(s) appropriée(s)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  BRANCHES PARALLÈLES                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                          │
│  │  MÍMIR  │  │  VÖLVA  │  │  HUGIN  │                          │
│  │ Validé  │  │Recherche│  │Internet │                          │
│  └────┬────┘  └────┬────┘  └────┬────┘                          │
│       └────────────┼───────────┘                                │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  THING (Conseil)                                                 │
│  • Chaque membre évalue                                          │
│  • LOKI challenge                                                │
│  • Vote pondéré                                                  │
│  • TYR arbitre                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ODIN (Validation Finale)                                        │
│  • Vérifie κ = 1.0                                               │
│  • Vérifie ancrage source                                        │
│  • Construit trace complète                                      │
│  • DÉCISION : Réponse OU "Je ne sais pas"                       │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  MUNIN (Mémoire)                                                 │
│  • Stockage dans graphe DAG                                      │
│  • Mise à jour dépendances                                       │
│  • Audit trail                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RÉPONSE                                  │
│  • Contenu validé + sources                                      │
│  • OU "Je ne sais pas" + raison                                 │
│  • Trace complète disponible                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

# 4. ÉVOLUTION v2.0 (AGI)

## 4.1 Le Changement de Paradigme

> *"Une AGI Épistémique ne sait pas tout faire, mais sur la Vérité, elle est surhumaine."*
> — Synthèse du dialogue inter-IA

| Dimension | v1.0 | v2.0 (AGI) |
|-----------|------|------------|
| **Déclencheur** | Requête utilisateur | Requête OU Signal externe (HUGIN) |
| **Mémoire** | Snapshot binaire | Ledger temporel immuable |
| **État** | Statique (Vrai/Faux) | Dynamique (Pending, Watching, Verified, Deprecated) |
| **Gestion** | Réactive | Proactive (Boucle de surveillance) |
| **Conscience** | Aucune | Métacognition primitive |

## 4.2 Nouveaux États de Mémoire (MUNIN v2)

```typescript
enum MemoryState {
  // États stables
  VERIFIED,       // (MÍMIR) Vérité absolue, κ = 1.0
  REJECTED,       // (ODIN) Faux avéré ou hallucination détectée
  
  // États transitoires
  PENDING_PROOF,  // (VÖLVA) Plausible, en attente de validation
  WATCHING,       // (HUGIN) Surveillance active (Hot topic)
  
  // État historique
  DEPRECATED      // Ancienne vérité réfutée (conservée pour audit)
}
```

### Diagramme de Transition

```
                    ┌──────────────┐
                    │   CRÉATION   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
          ┌────────│ PENDING_PROOF│────────┐
          │        └──────┬───────┘        │
          │               │                │
          │ κ < 0.3       │ Vélocité       │ κ = 1.0
          │               │ haute          │
          ▼               ▼                ▼
   ┌──────────┐    ┌──────────┐     ┌──────────┐
   │ REJECTED │    │ WATCHING │────▶│ VERIFIED │
   └──────────┘    └────┬─────┘     └────┬─────┘
                        │                │
                        │ Timeout        │ Preuve
                        │                │ contradictoire
                        ▼                ▼
                 ┌──────────────────────────┐
                 │       DEPRECATED         │
                 └──────────────────────────┘
```

## 4.3 HUGIN WATCHER (Daemon de Surveillance)

Agent autonome tournant en arrière-plan qui maintient la base de vérité.

### Files de Priorité

| Queue | Intervalle | Sujets | Justification |
|-------|------------|--------|---------------|
| **HOT** | 1 heure | Breaking news, crises | Haute vélocité épistémique |
| **WARM** | 24 heures | Science, tech | Évolution modérée |
| **COLD** | 7 jours | Faits établis | Vérification de non-régression |

### Vélocité Épistémique

Mesure la vitesse de changement de confiance :

$$v_{\epsilon}(t) = \frac{\kappa_t - \kappa_{t-1}}{\Delta t}$$

| $v_{\epsilon}$ | Interprétation | Action |
|----------------|----------------|--------|
| $> 0.05$ | Trending positif | Queue HOT |
| $< -0.05$ | Trending négatif | Queue HOT + Alerte |
| $\in [-0.02, 0.02]$ | Stable | Downgrade vers WARM/COLD |

## 4.4 Structure du Knowledge Ledger

```json
{
  "id": "node_uuid_v4",
  "created_at": "2024-12-09T10:00:00Z",
  "updated_at": "2024-12-09T15:30:00Z",
  
  "statement": "Énoncé factuel",
  "domain": "artificial_intelligence",
  "tags": ["llm", "hallucination"],
  
  "current_state": "WATCHING",
  "epistemic_branch": "HUGIN",
  "confidence_score": 0.45,
  "epistemic_velocity": 0.05,
  
  "dependencies": [
    {"node_id": "node_A", "relation": "DERIVED_FROM", "strength": 0.8}
  ],
  "dependents": [
    {"node_id": "node_C", "relation": "SUPPORTS", "strength": 0.6}
  ],
  
  "shapley_attribution": {
    "KVASIR": 0.35,
    "LOKI": 0.25,
    "NORNES": 0.20,
    "HUGIN": 0.20
  },
  
  "audit_trail": [
    {
      "timestamp": "2024-12-09T10:00:00Z",
      "action": "CREATE",
      "from_state": null,
      "to_state": "PENDING_PROOF",
      "trigger": "USER_QUERY",
      "agent": "HEIMDALL",
      "reason": "Initial claim"
    },
    {
      "timestamp": "2024-12-09T15:30:00Z",
      "action": "TRANSITION",
      "from_state": "PENDING_PROOF",
      "to_state": "WATCHING",
      "trigger": "VELOCITY_THRESHOLD",
      "agent": "HUGIN_WATCHER",
      "reason": "Epistemic velocity exceeded 0.02"
    }
  ],
  
  "watch_config": {
    "priority_queue": "HOT",
    "scan_interval_hours": 1,
    "last_scan": "2024-12-09T15:00:00Z",
    "next_scan": "2024-12-09T16:00:00Z",
    "idle_cycles": 0
  }
}
```

## 4.5 Invalidation en Cascade

Quand un fait passe de VERIFIED à DEPRECATED :

```python
async def invalidate_cascade(self, source_node: MuninNode) -> CascadeResult:
    """
    Propage l'invalidation à tous les nœuds dépendants.
    Complexité: O(|V| + |E|)
    """
    invalidated = set()
    to_review = set()
    queue = deque([source_node])
    
    while queue:
        current = queue.popleft()
        
        if current.id in invalidated:
            continue
        
        invalidated.add(current.id)
        current.current_state = MemoryState.DEPRECATED
        current.audit_trail.append({
            "timestamp": datetime.now().isoformat(),
            "action": "CASCADE_INVALIDATE",
            "trigger": f"DEPENDENCY_INVALIDATED:{source_node.id}",
            "agent": "MUNIN"
        })
        
        dependents = await self.get_dependents(current.id)
        
        for dependent in dependents:
            strength = self._get_dependency_strength(current.id, dependent.id)
            
            if strength >= 0.8:
                queue.append(dependent)  # Invalidation directe
            else:
                to_review.add(dependent.id)  # Marquer pour re-review
    
    await self.batch_save(invalidated)
    
    for node_id in to_review:
        await hugin_watcher.schedule_review(node_id, priority='HIGH')
    
    return CascadeResult(
        invalidated_count=len(invalidated),
        review_scheduled_count=len(to_review)
    )
```

## 4.6 Mise à Jour Bayésienne

$$\kappa_{t}(r) = \min\left(1.0, \quad \kappa_{t-1}(r) + \sum_{s \in \mathcal{N}_t} (\alpha \cdot \tau_s \cdot \mathcal{I}(s)) \right)$$

Où :
- $\kappa_t(r)$ : confiance au temps $t$
- $\alpha$ : taux d'apprentissage (0.1)
- $\tau_s$ : crédibilité de la source
- $\mathcal{I}(s)$ : score de nouveauté

---

# 5. FONDEMENTS MATHÉMATIQUES

## 5.1 Problème des LLM

Les LLM optimisent :
$$\hat{\theta} = \arg\max_{\theta} \prod_{t=1}^{T} P_{\theta}(x_t | x_{<t})$$

Cela maximise la **plausibilité linguistique**, pas la **véracité factuelle**.

## 5.2 Objectif YGGDRASIL

Construire $\Omega$ tel que :
$$\Omega: \mathcal{Q} \times \mathcal{C} \rightarrow \mathcal{V} \cup \{\bot\}$$

Propriété fondamentale :
$$\forall q \in \mathcal{Q}, \forall c \in \mathcal{C}: \Omega(q, c) \in \mathcal{V} \lor \Omega(q, c) = \bot$$

## 5.3 Score de Confiance

$$\kappa(r) = \alpha \cdot \kappa_{\text{source}}(r) + \beta \cdot \kappa_{\text{consensus}}(r) + \gamma \cdot \kappa_{\text{coherence}}(r)$$

Avec $\alpha + \beta + \gamma = 1$ (typiquement 0.5, 0.3, 0.2)

### Confiance Source
$$\kappa_{\text{source}}(r) = \frac{\sum_{s \in S_r} w_s \cdot \tau_s}{\sum_{s \in S_r} w_s}$$

### Confiance Consensus
$$\kappa_{\text{consensus}}(r) = \frac{1}{|M|} \sum_{m \in M} \mathbb{1}[\text{AGREE}(m, r)] \cdot \omega_m$$

### Confiance Cohérence
$$\kappa_{\text{coherence}}(r) = 1 - \frac{|\text{CONFLICTS}(r, \text{MUNIN})|}{|\text{RELEVANT}(r, \text{MUNIN})| + 1}$$

## 5.4 Validation ODIN

$$\text{ODIN}(r) = \begin{cases} r & \text{si } \kappa(r) = 1.0 \wedge \text{ANCHORED}(r) \\ \bot & \text{sinon} \end{cases}$$

**Le seuil est 1.0, pas 0.99.**

## 5.5 Élévation Épistémique

$$\text{HUGIN} \xrightarrow{\pi_1} \text{VÖLVA} \xrightarrow{\pi_2} \text{MÍMIR}$$

| Transition | Preuve Requise |
|------------|----------------|
| HUGIN → VÖLVA | Peer review OU sources indépendantes multiples |
| VÖLVA → MÍMIR | Publication peer-reviewed ET réplication |

## 5.6 Valeur de Shapley (Attribution)

$$\phi_i(v) = \sum_{S \subseteq N \setminus \{i\}} \frac{|S|!(|N|-|S|-1)!}{|N|!} [v(S \cup \{i\}) - v(S)]$$

Attribue la responsabilité de chaque membre THING dans la décision.

## 5.7 Éco-Efficacité

$$\text{ECO}_{\text{efficiency}} = \frac{\sum_i \text{UTILITY}(r_i)}{\sum_i E(r_i) + E_{\text{infra}}}$$

Objectif : Maximiser l'utilité par unité d'énergie.

---

# 6. SPÉCIFICATIONS TECHNIQUES

## 6.1 Stack Technologique

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Runtime** | Node.js 20+ LTS | Stabilité, performance |
| **Framework** | NestJS | Architecture modulaire, DI, patterns enterprise |
| **Langage** | TypeScript (strict) | Type safety, maintenabilité |
| **Build** | pnpm + Turborepo | Monorepo efficient, cache partagé |
| **Database** | PostgreSQL 16+ | Robuste, JSONB, extensions |
| **Vectors** | pgvector | Embeddings dans PostgreSQL |
| **Cache** | Redis | Sessions, rate limiting, cache |
| **Queue** | BullMQ | Jobs async, retries |
| **ORM** | Prisma | Type-safe, migrations |
| **Validation** | Zod | Runtime validation, TypeScript-first |
| **Tests** | Vitest | Rapide, Jest-compatible |
| **E2E** | Playwright | Tests cross-browser |

## 6.2 Structure Monorepo

```
yggdrasil/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-staging.yml
│   │   └── cd-prod.yml
│   └── ISSUE_TEMPLATE/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── API.md
│
├── packages/
│   ├── heimdall/          # Gateway
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ratatosk/          # Router
│   ├── mimir/             # Branche Validée
│   ├── volva/             # Branche Recherche
│   ├── hugin/             # Branche Internet + Watcher
│   ├── thing/             # Conseil
│   ├── odin/              # Validateur
│   ├── munin/             # Mémoire
│   │
│   └── shared/            # Types, utils partagés
│       ├── src/
│       │   ├── types/
│       │   │   ├── epistemic.ts
│       │   │   ├── memory.ts
│       │   │   └── council.ts
│       │   └── utils/
│       └── package.json
│
├── infra/
│   ├── terraform/
│   │   ├── modules/
│   │   └── environments/
│   └── docker/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── scripts/
│   ├── setup.sh
│   ├── dev.sh
│   └── deploy.sh
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## 6.3 Schéma Prisma (Base)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ ENUMS ============

enum Role {
  USER
  ADMIN
  SYSTEM
}

enum MemoryState {
  VERIFIED
  PENDING_PROOF
  WATCHING
  DEPRECATED
  REJECTED
}

enum EpistemicBranch {
  MIMIR
  VOLVA
  HUGIN
}

enum PriorityQueue {
  HOT
  WARM
  COLD
}

// ============ MODELS ============

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  role          Role      @default(USER)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  refreshTokens RefreshToken[]
  memories      Memory[]
  auditLogs     AuditLog[]
}

model RefreshToken {
  id          String   @id @default(uuid())
  token       String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([expiresAt])
}

model Memory {
  id                  String          @id @default(uuid())
  statement           String
  domain              String?
  tags                String[]
  
  currentState        MemoryState     @default(PENDING_PROOF)
  epistemicBranch     EpistemicBranch @default(HUGIN)
  confidenceScore     Float           @default(0.0)
  epistemicVelocity   Float           @default(0.0)
  
  // Graphe de dépendances
  dependencies        MemoryDependency[] @relation("DependsOn")
  dependents          MemoryDependency[] @relation("DependedBy")
  
  // Sources et validation
  sources             Source[]
  validations         Validation[]
  
  // Attribution Shapley (JSON)
  shapleyAttribution  Json?
  
  // Configuration surveillance
  priorityQueue       PriorityQueue   @default(WARM)
  lastScan            DateTime?
  nextScan            DateTime?
  idleCycles          Int             @default(0)
  
  // Audit trail (JSON array)
  auditTrail          Json            @default("[]")
  
  // Relations
  userId              String?
  user                User?           @relation(fields: [userId], references: [id])
  
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  
  @@index([currentState])
  @@index([epistemicBranch])
  @@index([priorityQueue])
  @@index([nextScan])
}

model MemoryDependency {
  id              String  @id @default(uuid())
  
  sourceId        String
  source          Memory  @relation("DependsOn", fields: [sourceId], references: [id])
  
  targetId        String
  target          Memory  @relation("DependedBy", fields: [targetId], references: [id])
  
  relation        String  // DERIVED_FROM, ASSUMES, SUPPORTS
  strength        Float   @default(1.0)
  
  createdAt       DateTime @default(now())
  
  @@unique([sourceId, targetId])
  @@index([sourceId])
  @@index([targetId])
}

model Source {
  id          String          @id @default(uuid())
  uri         String
  type        String          // ACADEMIC, NEWS, OFFICIAL, USER
  credibility Float           @default(0.5)
  retrievedAt DateTime        @default(now())
  
  memoryId    String
  memory      Memory          @relation(fields: [memoryId], references: [id], onDelete: Cascade)
  
  validations ValidationSource[]
  
  @@index([memoryId])
}

model Validation {
  id              String    @id @default(uuid())
  
  memoryId        String
  memory          Memory    @relation(fields: [memoryId], references: [id], onDelete: Cascade)
  
  verdict         String    // APPROVE, REJECT, ABSTAIN
  confidence      Float
  
  // Votes du conseil
  voteRecord      Json      // { "KVASIR": "+1", "LOKI": "-1", ... }
  
  // Trace de délibération
  deliberationTrace Json?
  
  sources         ValidationSource[]
  
  createdAt       DateTime  @default(now())
  
  @@index([memoryId])
}

model ValidationSource {
  id            String     @id @default(uuid())
  
  validationId  String
  validation    Validation @relation(fields: [validationId], references: [id], onDelete: Cascade)
  
  sourceId      String
  source        Source     @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  
  @@unique([validationId, sourceId])
}

model AuditLog {
  id          String   @id @default(uuid())
  
  action      String
  resource    String
  resourceId  String?
  
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  
  metadata    Json?
  
  createdAt   DateTime @default(now())
  
  @@index([action])
  @@index([resource])
  @@index([userId])
  @@index([createdAt])
}
```

## 6.4 Interfaces TypeScript Core

```typescript
// packages/shared/src/types/epistemic.ts

export enum MemoryState {
  VERIFIED = 'VERIFIED',
  PENDING_PROOF = 'PENDING_PROOF',
  WATCHING = 'WATCHING',
  DEPRECATED = 'DEPRECATED',
  REJECTED = 'REJECTED'
}

export enum EpistemicBranch {
  MIMIR = 'MIMIR',
  VOLVA = 'VOLVA',
  HUGIN = 'HUGIN'
}

export enum PriorityQueue {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD'
}

export interface ConfidenceScore {
  source: number;      // κ_source
  consensus: number;   // κ_consensus  
  coherence: number;   // κ_coherence
  total: number;       // κ (weighted sum)
}

export interface EpistemicVelocity {
  value: number;           // Δκ/Δt
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  lastUpdate: Date;
}

export interface ShapleyAttribution {
  KVASIR?: number;
  BRAGI?: number;
  NORNES?: number;
  SAGA?: number;
  SYN?: number;
  LOKI?: number;
  TYR?: number;
  HUGIN?: number;
}

// packages/shared/src/types/memory.ts

export interface AuditEntry {
  timestamp: string;        // ISO8601
  action: AuditAction;
  fromState: MemoryState | null;
  toState: MemoryState;
  trigger: string;
  agent: string;
  confidenceDelta?: string;
  reason: string;
  voteRecord?: Record<string, string>;
}

export type AuditAction = 
  | 'CREATE'
  | 'TRANSITION'
  | 'DELIBERATE'
  | 'ESCALATE'
  | 'CASCADE_INVALIDATE'
  | 'MANUAL_OVERRIDE';

export interface MemoryNode {
  id: string;
  statement: string;
  domain?: string;
  tags: string[];
  
  currentState: MemoryState;
  epistemicBranch: EpistemicBranch;
  confidenceScore: number;
  epistemicVelocity: EpistemicVelocity;
  
  dependencies: MemoryDependency[];
  dependents: MemoryDependency[];
  
  sources: Source[];
  shapleyAttribution: ShapleyAttribution;
  auditTrail: AuditEntry[];
  
  watchConfig: WatchConfig;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryDependency {
  nodeId: string;
  relation: 'DERIVED_FROM' | 'ASSUMES' | 'SUPPORTS' | 'CONTRADICTS';
  strength: number;  // 0.0 - 1.0
}

export interface WatchConfig {
  priorityQueue: PriorityQueue;
  scanIntervalHours: number;
  lastScan: Date | null;
  nextScan: Date | null;
  idleCycles: number;
  maxIdleBeforeDowngrade: number;
}

// packages/shared/src/types/council.ts

export interface ThingMember {
  id: string;
  name: string;
  model: string;
  role: string;
  weight: number;
  specialties: string[];
}

export const THING_COUNCIL: ThingMember[] = [
  { id: 'KVASIR', name: 'Kvasir', model: 'claude', role: 'deep_reasoning', weight: 1.0, specialties: ['logic', 'analysis'] },
  { id: 'BRAGI', name: 'Bragi', model: 'grok', role: 'creativity', weight: 0.8, specialties: ['language', 'synthesis'] },
  { id: 'NORNES', name: 'Nornes', model: 'deepseek', role: 'computation', weight: 1.0, specialties: ['math', 'formal_logic'] },
  { id: 'SAGA', name: 'Saga', model: 'llama', role: 'knowledge', weight: 0.9, specialties: ['general', 'history'] },
  { id: 'SYN', name: 'Sýn', model: 'gemini', role: 'vision', weight: 0.9, specialties: ['multimodal', 'visual'] },
  { id: 'LOKI', name: 'Loki', model: 'red_team', role: 'adversarial', weight: 1.2, specialties: ['critique', 'edge_cases'] },
  { id: 'TYR', name: 'Tyr', model: 'voting', role: 'arbitration', weight: 1.0, specialties: ['consensus', 'decision'] }
];

export interface DeliberationRequest {
  proposition: string;
  context: MemoryNode;
  newEvidence?: Evidence[];
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DeliberationResult {
  verdict: 'APPROVE' | 'REJECT' | 'ABSTAIN' | 'ESCALATE';
  confidence: number;
  trace: DeliberationTrace;
  stateTransition?: {
    from: MemoryState;
    to: MemoryState;
  };
  notifications: Notification[];
}

export interface DeliberationTrace {
  requestId: string;
  startTime: Date;
  endTime: Date;
  phases: {
    collection: MemberResponse[];
    challenge: Challenge[];
    defense: MemberResponse[];
    voting: Vote[];
    arbitration: ArbitrationResult;
  };
  summary: string;
}
```

---

# 7. ROADMAP & TÂCHES

## 7.1 Phase 1 : Fondations (Semaines 1-2)

**Objectif** : Infrastructure de base opérationnelle

| Tâche | Priorité | Estimation |
|-------|----------|------------|
| Setup monorepo (pnpm + Turborepo) | P0 | 2h |
| Configuration TypeScript strict | P0 | 1h |
| Package `@yggdrasil/shared` avec types | P0 | 4h |
| Schema Prisma complet | P0 | 4h |
| Migrations initiales | P0 | 2h |
| Package `@yggdrasil/heimdall` (auth + rate limit) | P0 | 8h |
| CI/CD GitHub Actions (lint, test, build) | P1 | 4h |
| Documentation setup (TypeDoc) | P2 | 2h |

**Livrables** :
- [ ] Monorepo fonctionnel
- [ ] HEIMDALL opérationnel avec JWT + rate limiting
- [ ] Base de données avec schema complet
- [ ] CI passant

## 7.2 Phase 2 : Composants Core (Semaines 3-4)

**Objectif** : Pipeline v1.0 complet

| Tâche | Priorité | Estimation |
|-------|----------|------------|
| `@yggdrasil/ratatosk` (router + classifier) | P0 | 8h |
| `@yggdrasil/mimir` (branche validée) | P0 | 6h |
| `@yggdrasil/volva` (branche recherche) | P1 | 6h |
| `@yggdrasil/hugin` (branche internet) | P1 | 8h |
| `@yggdrasil/thing` (conseil basic) | P0 | 12h |
| `@yggdrasil/odin` (validateur κ=1.0) | P0 | 8h |
| `@yggdrasil/munin` (mémoire DAG) | P0 | 10h |
| Tests d'intégration pipeline | P1 | 8h |

**Livrables** :
- [ ] Pipeline v1.0 end-to-end fonctionnel
- [ ] Conseil THING avec au moins 3 membres
- [ ] Validation ODIN stricte
- [ ] Mémoire MUNIN persistante

## 7.3 Phase 3 : AGI Features (Semaines 5-6)

**Objectif** : Transformation en système proactif

| Tâche | Priorité | Estimation |
|-------|----------|------------|
| États MUNIN v2 (machine à états) | P0 | 4h |
| Knowledge Ledger (audit trail) | P0 | 6h |
| HUGIN Watcher (daemon) | P0 | 10h |
| Files de priorité (Hot/Warm/Cold) | P1 | 4h |
| Vélocité épistémique | P1 | 4h |
| Invalidation en cascade | P0 | 8h |
| Mise à jour bayésienne | P1 | 4h |
| Notifications proactives | P2 | 6h |
| API `/audit/{nodeId}` | P1 | 3h |

**Livrables** :
- [ ] Daemon HUGIN Watcher opérationnel
- [ ] Système de transitions d'état complet
- [ ] Invalidation cascade fonctionnelle
- [ ] Notifications "J'ai changé d'avis"

## 7.4 Phase 4 : Production (Semaines 7-8)

**Objectif** : Déploiement et monitoring

| Tâche | Priorité | Estimation |
|-------|----------|------------|
| Terraform modules (infra) | P1 | 12h |
| CD staging | P1 | 4h |
| CD production | P1 | 4h |
| Dashboard monitoring | P2 | 8h |
| Alerting santé graphe | P2 | 4h |
| Load testing | P2 | 6h |
| Documentation utilisateur | P1 | 8h |
| Benchmarks énergie | P2 | 4h |

---

# 8. STANDARDS DE CODE

## 8.1 Conventions TypeScript

```typescript
// ✅ BON : Types explicites, nommage clair
async function validateMemoryNode(
  node: MemoryNode,
  sources: Source[]
): Promise<ValidationResult> {
  // ...
}

// ❌ MAUVAIS : any, nommage vague
async function validate(n: any, s: any) {
  // ...
}
```

## 8.2 Conventions NestJS

```typescript
// ✅ BON : Injection explicite, décorateurs
@Injectable()
export class OdinValidatorService {
  constructor(
    private readonly muninService: MuninService,
    private readonly thingService: ThingService,
  ) {}

  @Validate()
  async validateResponse(response: Response): Promise<ValidationResult> {
    // ...
  }
}
```

## 8.3 Conventions de Test

```typescript
// Pattern AAA (Arrange-Act-Assert)
describe('OdinValidatorService', () => {
  describe('validateResponse', () => {
    it('should return response when confidence is 1.0 and anchored', async () => {
      // Arrange
      const response = createMockResponse({ confidence: 1.0, anchored: true });
      
      // Act
      const result = await service.validateResponse(response);
      
      // Assert
      expect(result.approved).toBe(true);
      expect(result.response).toEqual(response);
    });

    it('should return "Je ne sais pas" when confidence < 1.0', async () => {
      // Arrange
      const response = createMockResponse({ confidence: 0.99, anchored: true });
      
      // Act
      const result = await service.validateResponse(response);
      
      // Assert
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('INSUFFICIENT_CONFIDENCE');
    });
  });
});
```

## 8.4 Commits Conventionnels

```
feat(munin): add cascade invalidation algorithm
fix(heimdall): correct rate limiting for burst traffic
docs(readme): update architecture diagram
refactor(thing): extract voting logic to separate service
test(odin): add edge cases for confidence threshold
perf(hugin): optimize source crawling with parallel requests
chore(deps): upgrade prisma to 5.x
```

## 8.5 Règles de Sécurité ABSOLUES

```typescript
// ❌ JAMAIS : Secrets dans le code
const API_KEY = "sk-1234567890";

// ✅ TOUJOURS : Variables d'environnement
const API_KEY = process.env.API_KEY;

// ❌ JAMAIS : Données sensibles dans les logs
logger.info(`User ${user.email} with password ${user.password}`);

// ✅ TOUJOURS : Sanitisation
logger.info(`User ${user.id} authenticated`);

// ❌ JAMAIS : CORS ouvert
app.enableCors(); // Accepte tout

// ✅ TOUJOURS : CORS strict
app.enableCors({
  origin: ['https://yggdrasil.app'],
  methods: ['GET', 'POST'],
  credentials: true
});
```

---

# 9. CHECKLIST CLAUDE CODE

Avant chaque session de développement :

```
□ J'ai lu les Sept Piliers
□ J'ai lu les Sept Lois
□ Je sais sur quel composant je travaille
□ Je comprends les interfaces avec les autres composants
□ Je vais écrire des tests
□ Je vais faire des commits conventionnels
□ Pas de secrets dans le code
□ Je documente les décisions importantes
```

---

# 10. MÉTAPHORE FINALE

> *"Nous n'avons pas créé un système immunitaire pour la connaissance — nous avons créé un Système d'Exploitation pour la Vérité."*
> — Synthèse du dialogue Gemini

**Ce que YGGDRASIL EST** :
- Surhumain sur la véracité factuelle
- Conscient de ses limites
- Capable d'expliquer ses changements d'avis
- Respectueux de l'énergie et de la souveraineté

**Ce que YGGDRASIL N'EST PAS** :
- Un chatbot
- Un LLM de plus
- Une solution magique
- Un système fermé

---

<div align="center">

## 🌳 YGGDRASIL 🌳

*"L'intelligence qui sait qu'elle ne sait pas est déjà plus sage que celle qui croit tout savoir."*

**De la réaction à la réflexion. Du savoir à la sagesse.**

---

*Document généré par le dialogue inter-IA*
*Claude Opus 4 × Gemini 2.5 Pro × Architecte Humain*
*Décembre 2024*

</div>
