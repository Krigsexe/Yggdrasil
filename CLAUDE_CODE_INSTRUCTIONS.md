# 🤖 INSTRUCTIONS CLAUDE CODE - Mise à Jour YGGDRASIL

> **Date**: 2025-12-10  
> **Objectif**: Intégrer la vision fondamentale et le système de classification temporelle  
> **Priorité**: HAUTE

---

## ⚠️ RÈGLES CRITIQUES

Avant toute modification :

1. **VÉRIFIER LES DOUBLONS** - Ne jamais créer de fichier qui existe déjà
2. **VÉRIFIER LA SÉCURITÉ** - Pas de secrets, tokens, ou données sensibles dans les commits
3. **VÉRIFIER LES SOURCES** - Toute modification doit être traçable vers ce document
4. **DOCUMENTER** - Chaque modification doit être reflétée dans la doc
5. **COMMIT ATOMIQUE** - Un commit = une tâche logique complète
6. **PUSH SYSTÉMATIQUE** - Après chaque phase validée, push sur le repo distant

---

## 📋 CHECKLIST DE PRÉ-EXÉCUTION

Avant de commencer, vérifier :

```bash
# 1. Vérifier l'état du repo
git status
git pull origin main

# 2. Vérifier les fichiers existants
ls -la docs/
ls -la prisma/
cat prisma/schema.prisma | head -50

# 3. Vérifier qu'il n'y a pas de doublons
grep -r "VISION" docs/ || echo "Pas de VISION.md existant"
grep -r "KnowledgeStatus" prisma/ || echo "Pas de KnowledgeStatus existant"
```

---

## 📁 FICHIERS À INTÉGRER

### Fichier 1 : `docs/VISION.md`

**Action** : CRÉER ou REMPLACER si existe

**Vérification pré-création** :

```bash
if [ -f "docs/VISION.md" ]; then
  echo "⚠️ VISION.md existe déjà - COMPARER avant de remplacer"
  diff docs/VISION.md /chemin/vers/nouveau/VISION.md
fi
```

**Contenu** : Voir fichier `docs/VISION.md` fourni (document complet de vision fondamentale)

**Post-création** :

```bash
git add docs/VISION.md
git commit -m "docs: add foundational VISION.md document

- Add complete philosophical vision
- Add temporal classification system description
- Add multi-instance architecture concept
- Add sustainability model
- Add strategic roadmap

Ref: Audio transcriptions 2025-12-10"
```

---

### Fichier 2 : Mise à jour `prisma/schema.prisma`

**Action** : AJOUTER les définitions (NE PAS REMPLACER le fichier entier)

**Vérification pré-modification** :

```bash
# Vérifier si les enums/modèles existent déjà
grep -E "^enum KnowledgeStatus" prisma/schema.prisma && echo "⚠️ KnowledgeStatus existe déjà!"
grep -E "^model Knowledge " prisma/schema.prisma && echo "⚠️ Model Knowledge existe déjà!"
```

**Si les modèles N'EXISTENT PAS** :

1. Ouvrir `prisma/schema.prisma`
2. Ajouter les enums à la fin des enums existants
3. Ajouter les modèles à la fin des modèles existants
4. NE PAS dupliquer les enums/modèles qui existent déjà

**Contenu à ajouter** : Voir fichier `prisma/schema-temporal-classification.prisma`

**Post-modification** :

```bash
# Valider le schema
npx prisma validate

# Si valide, créer la migration
npx prisma migrate dev --name add_temporal_classification

# Commit
git add prisma/
git commit -m "feat(prisma): add temporal classification system

- Add KnowledgeStatus enum with 11 states
- Add SourceTrustLevel enum
- Add ReviewType enum
- Add YggdrasilInstance enum for multi-instance
- Add Knowledge model with temporal metadata
- Add KnowledgeSource model
- Add StatusChange model for history
- Add Contradiction model
- Add ExplorationBranch model for VÖLVA
- Add ScheduledReview model
- Add KnowledgeRelation model
- Add InstanceConfig model for multi-instance

Ref: docs/VISION.md"
```

---

## 📝 MISES À JOUR DOCUMENTATION EXISTANTE

### 1. Mettre à jour `README.md`

**Sections à ajouter/modifier** :

```markdown
## Vision

Pour comprendre la philosophie et les objectifs fondamentaux de YGGDRASIL,
consultez [docs/VISION.md](docs/VISION.md).

## Classification Temporelle

YGGDRASIL utilise un système de classification temporelle unique où chaque
connaissance possède un statut évolutif :

- `VERIFIED` - Fait vérifié par consensus multi-LLM
- `THEORIZED_ACTIVE` - Hypothèse en exploration
- `CLASSIFIED_EXHAUSTED` - Sujet entièrement exploré

Voir [docs/VISION.md#système-de-classification-temporelle](docs/VISION.md#système-de-classification-temporelle)
```

**Commit** :

```bash
git add README.md
git commit -m "docs: update README with VISION and classification references"
```

---

### 2. Mettre à jour `docs/ARCHITECTURE.md`

**Sections à ajouter** :

```markdown
## Système de Classification Temporelle

Référence complète : [VISION.md#système-de-classification-temporelle](VISION.md#système-de-classification-temporelle)

### Flux de Statuts
```

PENDING_VALIDATION → ODIN → VERIFIED / REJECTED / THEORIZED_ACTIVE
↓
REVIEW_SCHEDULED
↓
CONTRADICTED / SUPERSEDED

```

### Modèles de Données

- `Knowledge` : Entrée centrale avec métadonnées temporelles
- `KnowledgeSource` : Sources avec niveaux de confiance
- `StatusChange` : Historique des transitions
- `ExplorationBranch` : Branches VÖLVA
- `Contradiction` : Relations contradictoires
```

**Commit** :

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: add temporal classification to ARCHITECTURE.md"
```

---

### 3. Mettre à jour/Créer `TODO.md` ou `docs/TODO.md`

**Vérifier l'existence** :

```bash
ls -la TODO.md docs/TODO.md 2>/dev/null || echo "Créer TODO.md"
```

**Contenu à ajouter/créer** :

```markdown
# YGGDRASIL - TODO

> Dernière mise à jour : 2025-12-10

## Légende

- [ ] À faire
- [x] Complété
- [~] En cours
- [!] Bloqué

---

## Phase MVP (Q4 2025)

### Infrastructure

- [x] Configuration root (package.json, turbo.json, docker-compose)
- [x] Schema Prisma base (Memory, Source, Claim, Hypothesis)
- [~] Migrations Prisma initialisées
- [ ] Système de classification temporelle intégré

### MUNIN (Mémoire) - 70%

- [x] Prisma integration
- [x] Cascade invalidation
- [x] Dependency tracking
- [ ] Real embeddings (OpenAI/Ollama)
- [ ] Semantic search avec pgvector

### HEIMDALL (Gateway) - 75%

- [x] Bridges pour Prisma
- [ ] Audit logs en DB
- [ ] Rate limiting avancé

### ODIN (Validation) - 75%

- [x] Pipeline 5 étapes
- [ ] Real claim extraction
- [ ] Intégration KnowledgeStatus

### THING (Conseil) - 70%

- [x] LOKI/TYR voting
- [ ] Gemini adapter complet
- [ ] Groq adapter complet

### MÍMIR (Faits) - 65%

- [x] ArXiv adapter
- [ ] PubMed adapter
- [ ] ISO/RFC adapters
- [ ] Vector search

### VÖLVA (Hypothèses) - 60%

- [x] CRUD operations
- [ ] DB persistence
- [ ] Intégration ExplorationBranch
- [ ] Promotion workflow

### HUGIN (Internet) - 55%

- [x] Trust scoring
- [ ] Web scraping
- [ ] Misinformation detection

### BIFROST (Frontend) - 45%

- [x] Multi-LLM chat base
- [ ] Validation indicators
- [ ] Trace visualization
- [ ] KnowledgeStatus display

### RATATOSK (Router) - 70%

- [x] Pattern classification
- [ ] ML-based routing

### Documentation

- [x] MANIFESTO.md
- [x] README.md
- [x] CLAUDE.md
- [x] VISION.md ← NOUVEAU
- [~] ARCHITECTURE.md (à compléter)
- [ ] API.md

---

## Phase BETA (Q1 2026)

- [ ] Embeddings réels (OpenAI/Ollama)
- [ ] HUGIN collecte internet
- [ ] MÍMIR base de faits initiale
- [ ] Monitoring et observabilité
- [ ] Tests de charge
- [ ] Sécurité auditée

---

## Phase V1.0 (Q2 2026)

- [ ] Tous les adaptateurs LLM
- [ ] API publique documentée
- [ ] Système d'audit complet
- [ ] Performance optimisée

---

## Phase PUBLIC (Q3 2026)

- [ ] Architecture multi-tenant
- [ ] Système de billing
- [ ] Filtrage PUBLIC→CORE
- [ ] Onboarding utilisateurs

---

## Notes

### Bloqueurs Actuels

1. Prisma migrations non initialisées
2. Embedding service placeholder (hash-based)
3. LLM adapters incomplets

### Prochaines Priorités

1. `npx prisma migrate dev --name init`
2. Intégrer classification temporelle
3. Implémenter embeddings réels
```

**Commit** :

```bash
git add TODO.md  # ou docs/TODO.md
git commit -m "docs: update TODO with temporal classification tasks

- Add classification temporelle integration tasks
- Update completion percentages
- Add VISION.md to completed docs
- Add blockers and priorities"
```

---

### 4. Mettre à jour `CHANGELOG.md` ou créer si inexistant

```markdown
# Changelog

Toutes les modifications notables de ce projet sont documentées ici.

## [Unreleased]

### Added

- `docs/VISION.md` - Document de vision fondamentale
- Système de classification temporelle (KnowledgeStatus)
- Modèles Prisma pour classification temporelle :
  - Knowledge, KnowledgeSource, StatusChange
  - Contradiction, ExplorationBranch
  - ScheduledReview, KnowledgeRelation
  - InstanceConfig
- Enums : KnowledgeStatus, SourceTrustLevel, ReviewType, YggdrasilInstance

### Changed

- README.md : Ajout références VISION
- ARCHITECTURE.md : Ajout section classification temporelle
- TODO.md : Mise à jour avec nouvelles tâches

## [0.1.0] - 2025-12-XX (MVP Target)

### Core Components

- MUNIN : Mémoire avec Prisma integration
- HEIMDALL : Gateway avec bridges
- ODIN : Validation pipeline
- THING : Conseil multi-LLM
- MÍMIR : Base de faits
- VÖLVA : Hypothèses
- HUGIN : Internet/Sources
- BIFROST : Frontend
- RATATOSK : Router
```

---

## 🔄 SÉQUENCE D'EXÉCUTION

Exécuter dans cet ordre :

```bash
# 1. Préparation
git checkout main
git pull origin main
git checkout -b feat/temporal-classification

# 2. Créer VISION.md
# [Créer le fichier docs/VISION.md avec le contenu fourni]
git add docs/VISION.md
git commit -m "docs: add foundational VISION.md document"

# 3. Mettre à jour Prisma
# [Ajouter les définitions au schema.prisma]
npx prisma validate
npx prisma migrate dev --name add_temporal_classification
git add prisma/
git commit -m "feat(prisma): add temporal classification system"

# 4. Mettre à jour documentation
# [Modifier README.md, ARCHITECTURE.md, TODO.md, CHANGELOG.md]
git add docs/ README.md TODO.md CHANGELOG.md
git commit -m "docs: update all documentation with temporal classification"

# 5. Push et merge
git push origin feat/temporal-classification
# Créer PR ou merge directement selon workflow

# 6. Verification finale
git checkout main
git pull origin main
npx prisma validate
npm run lint
npm run test
```

---

## ✅ CHECKLIST POST-EXÉCUTION

- [ ] `docs/VISION.md` existe et est complet
- [ ] `prisma/schema.prisma` contient les nouveaux enums et modèles
- [ ] Migrations Prisma créées sans erreur
- [ ] `README.md` référence VISION.md
- [ ] `docs/ARCHITECTURE.md` contient section classification temporelle
- [ ] `TODO.md` mis à jour avec nouvelles tâches
- [ ] `CHANGELOG.md` mis à jour
- [ ] Tous les commits ont des messages descriptifs
- [ ] Push effectué sur repo distant
- [ ] Pas de secrets ou données sensibles dans les commits
- [ ] `npm run lint` passe
- [ ] `npm run test` passe (ou tests à jour)

---

## 🚨 EN CAS DE PROBLÈME

### Conflit de merge

```bash
git status
# Résoudre manuellement les conflits
git add .
git commit -m "fix: resolve merge conflicts"
```

### Erreur Prisma

```bash
npx prisma validate
# Lire l'erreur, corriger le schema
npx prisma format
npx prisma validate
```

### Doublon détecté

```bash
# NE PAS écraser sans vérification
diff fichier_existant fichier_nouveau
# Fusionner manuellement si nécessaire
```

### Rollback si nécessaire

```bash
git log --oneline -10
git revert <commit_hash>
# ou
git reset --hard <commit_hash>  # ⚠️ DESTRUCTIF
```

---

## 📞 CONTACT

Pour toute question sur ces instructions :

- Référencer ce document
- Consulter `docs/VISION.md` pour la philosophie
- Consulter `docs/ARCHITECTURE.md` pour les détails techniques

---

_Instructions générées le 2025-12-10_
_Version 1.0.0_
