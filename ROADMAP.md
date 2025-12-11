# Feuille de Route YGGDRASIL

> _"Un voyage de mille lieues commence par un premier pas."_ — Lao Tseu

Cette roadmap est **vivante**. Elle evolue avec la communaute et les apprentissages du projet.

---

## Ou Nous Sommes

```
Phase 1: FONDATIONS <-- VOUS ETES ICI
Phase 2: CONSTRUCTION
Phase 3: OUVERTURE
Phase 4: EXPANSION
```

---

## Phase 1 : Fondations (2024-2025)

_"Poser les pierres"_

### Objectifs

Etablir les bases du projet : vision, communaute, et premier prototype fonctionnel.

### Milestones

#### M1.1 : Vision et Documentation (Q4 2024) - COMPLETE

- [x] Publication du Manifeste
- [x] Repository GitHub public
- [x] README complet
- [x] Guide de contribution
- [x] Code de conduite
- [x] Politique de securite
- [x] Architecture complete implementee
- [x] Documentation d'architecture detaillee
- [ ] Les Sept Piliers (documentation approfondie)
- [ ] Les Sept Lois (documentation approfondie)

#### M1.2 : Communaute (Q4 2024 - Q1 2025) - EN COURS

- [ ] 10 premiers contributeurs
- [ ] Canal Discord / Matrix
- [ ] Premieres discussions GitHub
- [x] Template d'issues et PRs
- [x] CI/CD complet (lint, typecheck, test, build)
- [x] CodeQL security scanning

#### M1.3 : Prototype Alpha (Q1-Q2 2025) - COMPLETE

- [x] Structure monorepo fonctionnelle (pnpm + Turborepo)
- [x] HEIMDALL : Gateway complete (auth JWT, rate limiting, audit)
- [x] RATATOSK : Routage intelligent (classification, contexte)
- [x] THING : Conseil multi-modeles (Gemini + Groq, 6 membres)
- [x] ODIN : Validation avec ancrage sources
- [x] MUNIN : Memoire chrono-semantique (PGVector)
- [x] MIMIR : Integration sources (arXiv, PubMed)
- [x] VOLVA : Gestion hypotheses
- [x] HUGIN : Recherche web avec filtrage
- [x] BIFROST : Interface chat Next.js
- [x] Streaming temps reel des reflexions
- [x] Base de donnees Supabase PostgreSQL
- [x] Tests unitaires complets (115+ tests, AGI v2.0 services couverts)
- [ ] Documentation API OpenAPI

### Livrables Phase 1

- [x] Manifeste public
- [x] Repository avec documentation
- [x] Prototype fonctionnel demonstrant orchestration + validation
- [ ] Communaute active (10+ contributeurs)

---

## Phase 2 : Construction (2025-2026)

_"Elever les murs"_

### Objectifs

Construire les composants principaux et atteindre un systeme fonctionnel.

### Milestones

#### M2.1 : Les Trois Branches (Q2-Q3 2025) - EN COURS

- [x] **MIMIR** : Integration arXiv
- [x] **MIMIR** : Integration PubMed
- [x] **MIMIR** : Pipeline de validation de sources
- [x] **MIMIR** : EmbeddingService partage (Gemini)
- [x] **VOLVA** : Espace hypotheses avec flagging
- [x] **HUGIN** : Recherche web avec filtrage
- [ ] **HUGIN** : Detection de desinformation avancee
- [x] Separation stricte des bases de donnees (epistemique)

#### M2.2 : Le Conseil (Q3-Q4 2025) - COMPLETE

- [x] **THING** : Integration Gemini Pro (KVASIR - raisonnement)
- [x] **THING** : Integration Gemini Flash (BRAGI - synthese)
- [x] **THING** : Integration Qwen QWQ-32B (NORNES - calcul)
- [x] **THING** : Integration Llama 3.3 70B (SAGA - connaissance)
- [x] **THING** : Integration DeepSeek R1 (LOKI - critique)
- [x] **THING** : Systeme de vote/consensus (TYR)
- [ ] Benchmarks de performance formels

#### M2.3 : Le Maestro (Q4 2025 - Q1 2026) - EN COURS

- [x] **ODIN** : Validation multi-criteres
- [x] **ODIN** : Ancrage systematique a MIMIR
- [x] **ODIN** : Rejet explicite avec raisons
- [x] **ODIN** : ValidationTrace sur chaque reponse
- [ ] Taux de validation >99% sur faits verifiables (a mesurer)
- [ ] Taux de hallucination <1% (a mesurer)

#### M2.4 : La Memoire (Q1-Q2 2026) - EN COURS

- [x] **MUNIN** : Memoire chrono-semantique (PGVector)
- [x] **MUNIN** : EmbeddingService partage (Gemini)
- [x] **MUNIN** : Extraction de faits automatique
- [x] **MUNIN** : Knowledge Ledger avec audit trail immutable
- [x] **MUNIN** : Epistemic Velocity tracking (v_ε = Δκ/Δt)
- [x] **MUNIN** : Cascade invalidation algorithm (force-based)
- [x] **MUNIN** : Priority queues (HOT/WARM/COLD)
- [x] **MUNIN** : Graphe de dependances avec forces
- [ ] **MUNIN** : Systeme de checkpoints complet
- [ ] **MUNIN** : Rollback fonctionnel
- [ ] Tests de persistance et coherence

#### M2.5 : Qualite et Securite (Q2 2026)

- [ ] Couverture de tests >80%
- [ ] Tests d'integration complets
- [ ] Tests E2E
- [ ] Audit de securite interne
- [ ] Bug bounty (soft launch)

#### M2.6 : AGI v2.0 Features (Q2-Q3 2026) - COMPLETE

- [x] **Knowledge Ledger** : Audit trail temporel immutable
- [x] **Epistemic Velocity** : v_ε(t) = (κ_t - κ_{t-1}) / Δt
- [x] **Priority Queues** : HOT (1h) / WARM (24h) / COLD (7d)
- [x] **Cascade Invalidation** : O(|V| + |E|) avec forces
- [x] **HUGIN Watcher Daemon** : Surveillance proactive avec priority queues
- [x] **Shapley Attribution** : φ_i(v) = Σ[|S|!(n-|S|-1)!/n!] × [v(S∪{i}) - v(S)]
- [x] **Contradiction Detection** : Detection proactive integree dans Knowledge Watcher
- [x] **Proactive Alerts** : Systeme d'alertes sur changements de confiance

### Livrables Phase 2

- MIMIR avec sources scientifiques
- THING consortium multi-modeles
- ODIN validation 100%
- MUNIN memoire fonctionnelle avec Knowledge Ledger
- AGI v2.0 features (velocity, cascade, queues)
- Suite de tests complete

---

## Phase 3 : Ouverture (2026-2027)

_"Ouvrir les portes"_

### Objectifs

Rendre YGGDRASIL utilisable par le public et etablir une gouvernance.

### Milestones

#### M3.1 : API Publique (Q3 2026)

- [ ] API REST documentee (OpenAPI)
- [ ] SDK JavaScript/TypeScript
- [ ] SDK Python
- [ ] Exemples et tutoriels
- [ ] Playground interactif

#### M3.2 : Federation (Q4 2026)

- [ ] Protocole de federation defini
- [ ] Premieres instances federees (test)
- [ ] Synchronisation MIMIR entre instances
- [ ] Mecanismes de confiance inter-instances

#### M3.3 : Gouvernance (Q4 2026 - Q1 2027)

- [ ] Constitution de gouvernance
- [ ] Comite de pilotage elu
- [ ] Processus de decision documente
- [ ] Tresorerie transparente

#### M3.4 : Validation Externe (Q1-Q2 2027)

- [ ] Audit de securite externe
- [ ] Audit du systeme de validation
- [ ] Partenariats academiques (2+)
- [ ] Publications de recherche

### Livrables Phase 3

- API publique et SDKs
- Federation fonctionnelle
- Gouvernance etablie
- Audits externes

---

## Phase 4 : Expansion (2027+)

_"Etendre les branches"_

### Objectifs

Faire de YGGDRASIL une infrastructure mondiale pour l'IA ethique.

### Milestones

#### M4.1 : Internationalisation

- [ ] Interface multilingue (10+ langues)
- [ ] MIMIR multilingue (sources non-anglophones)
- [ ] Documentation traduite
- [ ] Communautes locales

#### M4.2 : Domaines Specialises

- [ ] YGGDRASIL Medical (avec MIMIR medical)
- [ ] YGGDRASIL Legal (avec MIMIR juridique)
- [ ] YGGDRASIL Scientific (research-focused)
- [ ] Partenariats sectoriels

#### M4.3 : Integrations Avancees

- [ ] Support World Models (JEPA, etc.)
- [ ] Agents autonomes avec validation
- [ ] Integration robotique (vision long terme)

#### M4.4 : Standardisation

- [ ] Proposition de standard ISO/IEEE
- [ ] Certification "YGGDRASIL-compatible"
- [ ] Framework d'evaluation de veracite IA

### Livrables Phase 4

- Presence internationale
- Domaines specialises
- Integrations avancees
- Standards reconnus

---

## Metriques de Succes

### Veracite

| Metrique              | Cible Phase 2 | Cible Phase 3 |
| --------------------- | ------------- | ------------- |
| Taux de hallucination | <5%           | <1%           |
| Precision des sources | >95%          | >99%          |
| Couverture MIMIR      | 1M+ sources   | 10M+ sources  |

### Communaute

| Metrique            | Cible Phase 2 | Cible Phase 3 |
| ------------------- | ------------- | ------------- |
| Contributeurs       | 50+           | 200+          |
| Stars GitHub        | 1,000+        | 10,000+       |
| Instances deployees | 10+           | 100+          |

### Technique

| Metrique         | Cible Phase 2 | Cible Phase 3 |
| ---------------- | ------------- | ------------- |
| Latence P95      | <5s           | <2s           |
| Uptime           | 99%           | 99.9%         |
| Couverture tests | >80%          | >90%          |

---

## Comment Cette Roadmap Evolue

1. **Revue trimestrielle** — Discussion communautaire
2. **PRs bienvenues** — Proposez des modifications
3. **Issues "roadmap"** — Discutez des priorites
4. **Votes communautaires** — Sur les decisions majeures

---

## Comment Contribuer a la Roadmap

### Proposer un changement

1. Ouvrez une issue avec le label `roadmap`
2. Expliquez le changement propose
3. Justifiez l'impact et la faisabilite
4. Participez a la discussion

### Prendre en charge un item

1. Commentez sur l'issue correspondante
2. Creez un plan d'implementation
3. Soumettez des PRs progressives
4. Documentez votre avancement

---

<div align="center">

**La route est longue, mais nous la parcourons ensemble.**

_Derniere mise a jour : Decembre 2025_

</div>
