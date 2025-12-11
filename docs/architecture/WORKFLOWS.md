# WORKFLOWS.md — YGGDRASIL

> **Processus opérationnels de gestion des connaissances**
> Formalisation des transitions entre états épistémiques.

---

## 1. WORKFLOW DE PROMOTION

### 1.1 HUGIN → VOLVA (Web → Recherche)

```
┌─────────────────────────────────────────────────────────────┐
│                    HUGIN → VOLVA                            │
│              (UNVERIFIED → THEORY/EMERGING)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CRITÈRES REQUIS (tous obligatoires) :                     │
│  ├─ [ ] 2+ sources indépendantes concordantes              │
│  ├─ [ ] Aucune contradiction active détectée               │
│  ├─ [ ] Score de crédibilité source > 40%                  │
│  └─ [ ] Passage du filtre anti-désinformation              │
│                                                             │
│  DÉCLENCHEUR :                                              │
│  ├─ Automatique : Détection de consensus multi-source      │
│  └─ Manuel : Demande utilisateur TRUSTED+                  │
│                                                             │
│  ACTIONS :                                                  │
│  ├─ Créer entrée VOLVA avec status = EMERGING              │
│  ├─ Lier les sources HUGIN originales                      │
│  ├─ Planifier review dans 7 jours                          │
│  └─ Logger StatusChange avec raison                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 VOLVA → MIMIR (Recherche → Vérifié)

```
┌─────────────────────────────────────────────────────────────┐
│                    VOLVA → MIMIR                            │
│              (THEORY → VERIFIED/AXIOM_STABLE)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CRITÈRES REQUIS :                                          │
│                                                             │
│  Pour VERIFIED (confiance 95%) :                           │
│  ├─ [ ] 3+ sources primaires (arXiv, PubMed, etc.)         │
│  ├─ [ ] Peer-review ou validation institutionnelle         │
│  ├─ [ ] Âge minimum : 30 jours en VOLVA                    │
│  ├─ [ ] 0 contradictions non-résolues                      │
│  └─ [ ] Validation CREATOR ou 2x ADMIN                     │
│                                                             │
│  Pour AXIOM_STABLE (confiance 100%) :                      │
│  ├─ [ ] Tous critères VERIFIED +                           │
│  ├─ [ ] Consensus scientifique établi (>5 ans)             │
│  ├─ [ ] Réplication indépendante confirmée                 │
│  ├─ [ ] Aucune contestation majeure active                 │
│  └─ [ ] Validation CREATOR obligatoire                     │
│                                                             │
│  DÉCLENCHEUR :                                              │
│  ├─ Scheduled review atteint + critères OK                 │
│  └─ Demande explicite ADMIN/CREATOR                        │
│                                                             │
│  ACTIONS :                                                  │
│  ├─ Créer/Mettre à jour entrée MIMIR                       │
│  ├─ Archiver entrée VOLVA (ne pas supprimer)               │
│  ├─ Créer KnowledgeRelation SUPERSEDES                     │
│  ├─ Notifier les instances PUBLIC abonnées                 │
│  └─ Logger StatusChange avec validateur                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. WORKFLOW DE RÉTROGRADATION

### 2.1 MIMIR → VOLVA (Vérifié → Recherche)

```
┌─────────────────────────────────────────────────────────────┐
│                    MIMIR → VOLVA                            │
│              (VERIFIED → CONTESTED/UPDATING)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DÉCLENCHEURS AUTOMATIQUES :                               │
│  ├─ Nouvelle étude contradictoire publiée (impact > 0.7)   │
│  ├─ Rétractation d'une source primaire                     │
│  ├─ Contradiction créée avec resolution = null             │
│  └─ Invalidation cascade depuis connaissance liée          │
│                                                             │
│  DÉCLENCHEURS MANUELS :                                    │
│  ├─ Demande ADMIN avec justification                       │
│  └─ Demande CREATOR (immédiat)                             │
│                                                             │
│  ACTIONS :                                                  │
│  ├─ Changer status → CONTESTED ou UPDATING                 │
│  ├─ Créer Contradiction si applicable                      │
│  ├─ Notifier CREATOR immédiatement                         │
│  ├─ Suspendre propagation vers instances PUBLIC            │
│  ├─ Planifier review urgent (72h)                          │
│  └─ Logger StatusChange avec evidence                      │
│                                                             │
│  ROLLBACK POSSIBLE : Oui, si contradiction résolue         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 VOLVA → HUGIN (Recherche → Bruit)

```
┌─────────────────────────────────────────────────────────────┐
│                    VOLVA → HUGIN                            │
│              (THEORY → DEPRECATED/REFUTED)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DÉCLENCHEURS :                                             │
│  ├─ Preuve de fausseté (réfutation publiée)                │
│  ├─ Sources originales invalidées                          │
│  ├─ Âge > 1 an sans progression vers MIMIR                 │
│  └─ Demande ADMIN/CREATOR                                  │
│                                                             │
│  ACTIONS (DEPRECATED) :                                     │
│  ├─ Changer status → DEPRECATED                            │
│  ├─ Conserver dans VOLVA (historique)                      │
│  ├─ Marquer "ne plus utiliser pour réponses"               │
│  └─ Logger raison de dépréciation                          │
│                                                             │
│  ACTIONS (REFUTED) :                                        │
│  ├─ Changer status → REFUTED                               │
│  ├─ Créer lien vers preuve de réfutation                   │
│  ├─ Bloquer toute promotion future                         │
│  └─ Invalider cascade connaissances dérivées               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. WORKFLOW DE RÉSOLUTION DES CONTRADICTIONS

```
┌─────────────────────────────────────────────────────────────┐
│              RÉSOLUTION DE CONTRADICTION                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ÉTAPE 1 : DÉTECTION                                        │
│  ├─ Automatique : Analyse sémantique détecte conflit       │
│  ├─ Manuel : Utilisateur/Admin signale                     │
│  └─ → Créer entrée Contradiction                           │
│                                                             │
│  ÉTAPE 2 : ÉVALUATION (72h max)                            │
│  ├─ Comparer les sources (qualité, date, impact)           │
│  ├─ Identifier le type de contradiction :                  │
│  │   ├─ FACTUELLE : A dit X, B dit non-X                   │
│  │   ├─ TEMPORELLE : A était vrai, maintenant B            │
│  │   ├─ CONTEXTUELLE : A vrai dans ctx1, B dans ctx2       │
│  │   └─ PARTIELLE : A et B vrais mais incomplets           │
│  └─ Assigner à ADMIN ou CREATOR selon gravité              │
│                                                             │
│  ÉTAPE 3 : RÉSOLUTION                                       │
│  ├─ FACTUELLE :                                            │
│  │   └─ Garder le plus sourcé, rétrograder l'autre         │
│  ├─ TEMPORELLE :                                           │
│  │   └─ Créer nouvelle version, archiver ancienne          │
│  ├─ CONTEXTUELLE :                                         │
│  │   └─ Séparer en 2 connaissances distinctes              │
│  └─ PARTIELLE :                                            │
│      └─ Fusionner en connaissance complète                 │
│                                                             │
│  ÉTAPE 4 : PROPAGATION                                      │
│  ├─ Mettre à jour connaissances affectées                  │
│  ├─ Notifier instances PUBLIC                              │
│  ├─ Logger résolution avec justification                   │
│  └─ Fermer Contradiction (resolvedAt = now)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. WORKFLOW D'APPROBATION HUMAN-IN-THE-LOOP

```
┌─────────────────────────────────────────────────────────────┐
│                 APPROBATION HUMAINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NIVEAUX D'APPROBATION :                                   │
│                                                             │
│  NIVEAU 0 - AUTOMATIQUE :                                  │
│  ├─ HUGIN → HUGIN (mise à jour)                            │
│  ├─ Lecture seule de toute donnée                          │
│  └─ Création mémoire PENDING                               │
│                                                             │
│  NIVEAU 1 - ADMIN (1 approbation) :                        │
│  ├─ HUGIN → VOLVA                                          │
│  ├─ Mémoire PENDING → VERIFIED (utilisateur standard)      │
│  └─ Rétrogradation VOLVA → DEPRECATED                      │
│                                                             │
│  NIVEAU 2 - 2x ADMIN ou CREATOR :                          │
│  ├─ VOLVA → MIMIR (VERIFIED)                               │
│  ├─ Résolution contradiction majeure                       │
│  └─ Invalidation cascade                                   │
│                                                             │
│  NIVEAU 3 - CREATOR OBLIGATOIRE :                          │
│  ├─ MIMIR → AXIOM_STABLE                                   │
│  ├─ Rétrogradation MIMIR → VOLVA                           │
│  ├─ Modification des 7 Lois/Piliers                        │
│  └─ Suppression définitive de données                      │
│                                                             │
│  WORKFLOW :                                                 │
│  ├─ Action déclenchée                                      │
│  ├─ Vérifier niveau requis                                 │
│  ├─ Si niveau insuffisant → File d'attente                 │
│  ├─ Notification aux approbateurs                          │
│  ├─ Timeout : 7 jours → Escalade au niveau supérieur       │
│  └─ Approbation reçue → Exécuter action + Logger           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. WORKFLOW DE SYNCHRONISATION MULTI-INSTANCE

```
┌─────────────────────────────────────────────────────────────┐
│              SYNCHRONISATION CORE → PUBLIC                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ARCHITECTURE :                                             │
│  ├─ CORE : Instance maître (Julien/Alixia)                 │
│  └─ PUBLIC : Instances abonnées (read-only MIMIR)          │
│                                                             │
│  CE QUI SE SYNCHRONISE :                                   │
│  ├─ MIMIR (VERIFIED + AXIOM_STABLE uniquement)             │
│  ├─ Métadonnées des sources                                │
│  └─ Schéma de classification temporelle                    │
│                                                             │
│  CE QUI NE SE SYNCHRONISE PAS :                            │
│  ├─ VOLVA (recherche en cours)                             │
│  ├─ HUGIN (bruit web)                                      │
│  ├─ Mémoires utilisateurs (MUNIN local)                    │
│  └─ Logs d'audit détaillés                                 │
│                                                             │
│  PROTOCOLE :                                                │
│  ├─ Push : CORE → PUBLIC sur promotion MIMIR               │
│  ├─ Pull : PUBLIC demande delta quotidien                  │
│  ├─ Signature : Chaque sync signée par CORE                │
│  └─ Rollback : PUBLIC peut revenir à snapshot précédent    │
│                                                             │
│  FRÉQUENCE :                                               │
│  ├─ AXIOM_STABLE : Immédiat (critique)                     │
│  ├─ VERIFIED : Batch quotidien                             │
│  └─ Rétrogradations : Immédiat (sécurité)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. MATRICE DES TRANSITIONS

| De \ Vers | HUGIN | VOLVA   | MIMIR   | AXIOM   |
| --------- | ----- | ------- | ------- | ------- |
| **HUGIN** | Auto  | Admin   | ✗       | ✗       |
| **VOLVA** | Admin | Auto    | 2xAdmin | Creator |
| **MIMIR** | ✗     | Creator | Auto    | Creator |
| **AXIOM** | ✗     | Creator | Creator | Auto    |

**Légende :**

- Auto : Mise à jour interne, pas de changement de branche
- Admin : 1 approbation ADMIN minimum
- 2xAdmin : 2 approbations ADMIN ou 1 CREATOR
- Creator : CREATOR obligatoire
- ✗ : Transition interdite

---

## 7. TIMEOUTS ET ESCALADES

| Action en attente        | Timeout  | Escalade              |
| ------------------------ | -------- | --------------------- |
| Approbation ADMIN        | 7 jours  | → CREATOR             |
| Résolution contradiction | 72h      | → CREATOR + alerte    |
| Review VOLVA planifiée   | 30 jours | → Rétrogradation auto |
| Promotion MIMIR          | 14 jours | → Annulation          |

---

## 8. CODES D'ERREUR WORKFLOW

| Code    | Signification                   | Action                      |
| ------- | ------------------------------- | --------------------------- |
| `WF001` | Critères promotion non atteints | Afficher critères manquants |
| `WF002` | Approbation insuffisante        | Escalader ou attendre       |
| `WF003` | Contradiction non résolue       | Bloquer promotion           |
| `WF004` | Source invalidée                | Réévaluer connaissance      |
| `WF005` | Timeout dépassé                 | Exécuter action par défaut  |
| `WF006` | Transition interdite            | Rejeter avec explication    |

---

_Document généré pour compléter VISION.md_
_Ces workflows sont implémentables dans le code YGGDRASIL_
