<div align="center">

# YGGDRASIL

### L'Arbre-Monde de l'Intelligence Artificielle

**Une AGI ethique, souveraine et verifiable — construite par l'humanite, pour l'humanite.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/Krigsexe/yggdrasil)

[Manifeste](MANIFESTO.md) | [Architecture](docs/architecture/OVERVIEW.md) | [Contribuer](CONTRIBUTING.md) | [Roadmap](ROADMAP.md)

</div>

---

## Le Probleme

L'IA actuelle est construite sur des fondations fragiles :

- **Hallucinations** — Les LLMs mentent avec confiance. 20-30% de fausses informations presentees comme verites.
- **Opacite** — Personne ne comprend pourquoi un modele repond ce qu'il repond.
- **Amnesie** — Chaque conversation repart de zero. Aucune memoire persistante.
- **Concentration** — Quelques corporations controlent les fondations de l'IA mondiale.
- **Gaspillage** — Des milliards depenses pour entrainer des modeles redondants.

**La question fondamentale :** L'AGI — la technologie la plus transformatrice de l'histoire — doit-elle etre developpee par et pour des actionnaires, ou par et pour l'humanite ?

---

## La Vision : YGGDRASIL

Dans la mythologie nordique, **Yggdrasil** est l'Arbre-Monde — le frene cosmique qui connecte les neuf royaumes, dont les racines puisent dans le **puits de Mimir** (la sagesse absolue), et dont les branches abritent tous les etres.

YGGDRASIL est une architecture d'AGI qui :

| Principe | Approche Actuelle | Approche YGGDRASIL |
|----------|-------------------|---------------------|
| **Verite** | "Probablement vrai" | "Verifie + sources" ou "Je ne sais pas" |
| **Memoire** | Reset a chaque session | Memoire chrono-semantique persistante |
| **Sources** | Melange opaque | Separation stricte : Valide / Recherche / Internet |
| **Modeles** | Un geant monolithique | Consortium de specialistes orchestres |
| **Controle** | Corporations privees | Open-source, auto-hebergeable, federable |
| **Energie** | Entrainer toujours plus | Mutualiser l'existant |

---

## Les Sept Piliers

YGGDRASIL repose sur sept principes intransgressibles :

### 1. Veracite Absolue
> *"Jamais de probabilite. La certitude ou le silence."*

YGGDRASIL dit "verifie, voici les sources" ou "je ne sais pas". Jamais "c'est probablement vrai".

### 2. Tracabilite Totale
> *"Chaque pensee a une origine. Chaque decision a une trace."*

Chaque reponse peut etre auditee : d'ou vient l'information, pourquoi cette decision, quel chemin de raisonnement.

### 3. Separation Epistemique
> *"Le savoir, l'hypothese et le bruit ne se melangent jamais."*

Trois branches strictement separees :
- **MIMIR** — Connaissances scientifiquement prouvees
- **VOLVA** — Hypotheses et theories en exploration
- **HUGIN** — Informations internet non verifiees

### 4. Memoire Vivante
> *"Une intelligence sans memoire n'est qu'un reflexe."*

YGGDRASIL se souvient : interactions passees, decisions prises, erreurs corrigees, contextes evolutifs.

### 5. Reversibilite
> *"Aucune erreur n'est definitive."*

Rollback possible vers n'importe quel etat passe. Correction des decisions basees sur des informations ulterieurement invalidees.

### 6. Souverainete
> *"Les donnees de l'humanite appartiennent a l'humanite."*

Open-source, auto-hebergeable, federable, auditable. Aucune dependance a un fournisseur unique.

### 7. Soutenabilite
> *"Une intelligence qui detruit sa planete n'est pas intelligente."*

Mutualisation des modeles existants. Zero entrainement de nouveaux modeles. Metriques de consommation transparentes.

---

## Architecture

```
MONDE --> HEIMDALL --> RATATOSK --> [MIMIR|VOLVA|HUGIN] --> THING --> ODIN --> MUNIN --> REPONSE
          Gateway      Routage      Les Trois Branches      Conseil   Maestro  Memoire   Validee
```

### Les Composants

| Composant | Role | Inspiration |
|-----------|------|-------------|
| **HEIMDALL** | Gateway — Auth, rate limiting, audit | Le gardien du Bifrost qui voit et entend tout |
| **RATATOSK** | Routage — Classification, extraction de contexte | L'ecureuil messager qui parcourt l'arbre |
| **MIMIR** | Branche Validee — Connaissances prouvees (100%) | Le puits de sagesse ou Odin sacrifia son oeil |
| **VOLVA** | Branche Recherche — Hypotheses, theories | La voyante qui explore l'inconnu |
| **HUGIN** | Branche Internet — Informations filtrees | "Pensee" — corbeau explorateur d'Odin |
| **THING** | Consortium — Deliberation multi-modeles | L'assemblee ou les dieux prennent les decisions |
| **ODIN** | Maestro — Validation finale, synthese | Le Pere-de-Tout, celui qui sait |
| **MUNIN** | Memoire — Stockage chrono-semantique | "Memoire" — l'autre corbeau d'Odin |
| **BIFROST** | Interface Chat — Frontend utilisateur | Le pont arc-en-ciel vers les dieux |

### Le Conseil (THING) — Configuration Actuelle

| Membre | Specialite | Modele | Provider |
|--------|------------|--------|----------|
| **KVASIR** | Raisonnement profond | Gemini 2.5 Pro | Google |
| **BRAGI** | Synthese creative | Gemini 2.5 Flash | Google |
| **SYN** | Vision multimodale | Gemini 2.5 Pro | Google |
| **NORNES** | Raisonnement avance | Qwen QWQ-32B | Groq |
| **SAGA** | Connaissance generale | Llama 3.3 70B | Groq |
| **LOKI** | Critique adversariale | DeepSeek R1 Distill | Groq |
| **TYR** | Arbitrage, consensus | Voting system | Local |

---

## Installation Rapide

### Prerequis

- **Node.js** 20+ (LTS)
- **pnpm** 9+ (`npm install -g pnpm`)
- **Docker** (pour PostgreSQL et Supabase)
- **Git**

### Etape 1 : Cloner et Installer

```bash
# Cloner le repository
git clone https://github.com/Krigsexe/yggdrasil.git
cd yggdrasil

# Installer les dependances
pnpm install
```

### Etape 2 : Obtenir les Cles API (GRATUIT)

YGGDRASIL utilise deux providers LLM avec **tiers gratuits genereux** :

| Provider | Cles Requises | Lien d'inscription |
|----------|--------------|---------------------|
| **Groq** | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com/keys) |
| **Google Gemini** | `GOOGLE_GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/apikey) |

### Etape 3 : Configuration

```bash
# Copier le template d'environnement
cp .env.example .env

# Editer .env et ajouter vos cles API
# GROQ_API_KEY=gsk_xxxx
# GOOGLE_GEMINI_API_KEY=AIzaSyxxxx
```

### Etape 4 : Demarrer les Services

```bash
# 1. Demarrer Supabase (fournit PostgreSQL sur le port 54322)
cd packages/bifrost
npx supabase start

# 2. Revenir a la racine et demarrer Redis (optionnel, pour le cache)
cd ../..
docker compose up -d

# 3. Initialiser la base de donnees
pnpm prisma migrate dev

# 4. Demarrer HEIMDALL (backend) sur le port 3000
pnpm --filter @yggdrasil/heimdall dev

# Dans un autre terminal, demarrer BIFROST (frontend) sur le port 3001
cd packages/bifrost
pnpm dev
```

### Etape 5 : Utiliser YGGDRASIL

Ouvrir [http://localhost:3001](http://localhost:3001) dans votre navigateur.

1. Creer un compte utilisateur
2. Creer un workspace
3. Selectionner le modele **"YGGDRASIL"** dans les parametres
4. Commencer a discuter !

---

## Installation One-Click (Scripts)

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Krigsexe/yggdrasil/main/scripts/setup.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/Krigsexe/yggdrasil/main/scripts/setup.ps1 | iex
```

Ces scripts :
1. Verifient les prerequis (Node.js, pnpm, Docker)
2. Clonent le repository
3. Installent les dependances
4. Creent le fichier `.env` a partir du template
5. Demarrent les services Docker
6. Affichent les instructions pour ajouter les cles API

---

## Configuration des Cles API

### Groq (GRATUIT)

1. Aller sur [console.groq.com](https://console.groq.com/)
2. Creer un compte (email ou GitHub)
3. Aller dans "API Keys"
4. Creer une nouvelle cle
5. Copier la cle `gsk_xxxx...`
6. Ajouter dans `.env` : `GROQ_API_KEY=gsk_xxxx...`

**Modeles utilises :**
- `qwen-qwq-32b` (NORNES) — Raisonnement avance
- `llama-3.3-70b-versatile` (SAGA) — Connaissance generale
- `deepseek-r1-distill-llama-70b` (LOKI) — Critique

### Google Gemini (GRATUIT)

1. Aller sur [aistudio.google.com](https://aistudio.google.com/)
2. Se connecter avec un compte Google
3. Cliquer sur "Get API Key"
4. Creer une cle API
5. Copier la cle `AIzaSy...`
6. Ajouter dans `.env` : `GOOGLE_GEMINI_API_KEY=AIzaSy...`

**Modeles utilises :**
- `gemini-2.5-pro` (KVASIR, SYN) — Raisonnement profond
- `gemini-2.5-flash-preview-05-20` (BRAGI) — Synthese rapide

---

## Commandes Utiles

```bash
# Developement
pnpm dev                                    # Tous les packages
pnpm --filter @yggdrasil/heimdall dev       # Backend uniquement
pnpm --filter @yggdrasil/bifrost dev        # Frontend uniquement

# Build
pnpm build

# Tests
pnpm test

# Linting
pnpm lint
pnpm lint:fix

# Base de donnees
pnpm prisma studio                          # Interface visuelle DB
pnpm prisma migrate dev                     # Appliquer migrations
pnpm prisma generate                        # Regenerer le client

# Docker
docker compose up -d                        # Demarrer les services
docker compose down                         # Arreter les services
docker compose logs -f                      # Voir les logs
```

---

## Structure du Projet

```
yggdrasil/
├── packages/
│   ├── heimdall/          # Gateway API (NestJS)
│   ├── ratatosk/          # Routeur (classification)
│   ├── mimir/             # Branche Validee
│   ├── volva/             # Branche Recherche
│   ├── hugin/             # Branche Internet
│   ├── thing/             # Conseil multi-modeles
│   ├── odin/              # Maestro validation
│   ├── munin/             # Memoire
│   ├── bifrost/           # Frontend Chat (Next.js)
│   └── shared/            # Types partages
├── prisma/                # Schema base de donnees
├── docker-compose.yml     # Services Docker
├── .env.example           # Template configuration
└── CLAUDE.md              # Guide developpeur
```

---

## Documentation

- [**Manifeste**](MANIFESTO.md) — La vision complete et les principes fondateurs
- [**Architecture**](docs/architecture/OVERVIEW.md) — Vue technique detaillee
- [**Les Sept Piliers**](docs/architecture/SEVEN_PILLARS.md) — Principes en profondeur
- [**Les Sept Lois**](docs/architecture/SEVEN_LAWS.md) — Regles intransgressibles
- [**Guide de Demarrage**](docs/technical/GETTING_STARTED.md) — Installation pas a pas
- [**API**](docs/technical/API.md) — Specifications de l'API
- [**Contribuer**](CONTRIBUTING.md) — Comment participer

---

## Contribuer

YGGDRASIL est un projet communautaire. Nous cherchons :

| Profil | Contribution |
|--------|--------------|
| **Architectes** | Developpeurs, ingenieurs, chercheurs IA |
| **Gardiens** | Ethiciens, philosophes, juristes |
| **Eclaireurs** | Scientifiques de toutes disciplines |
| **Critiques** | Sceptiques, red teamers, adversaires |
| **Citoyens** | Utilisateurs, curieux, concernes |

**Lire le [Guide de Contribution](CONTRIBUTING.md)** pour commencer.

---

## Roadmap

### Phase 1 : Fondations (2024-2025)
- [x] Publication du Manifeste
- [x] Repository public
- [x] Architecture complete implementee
- [x] THING Council operationnel (Gemini + Groq)
- [x] BIFROST frontend integre
- [x] Streaming temps reel des reflexions
- [ ] Documentation complete
- [ ] Tests et validation

### Phase 2 : Construction (2025-2026)
- [ ] MIMIR : Integration sources scientifiques (arXiv, PubMed)
- [ ] ODIN : Validation 100% avec ancrage sources
- [ ] MUNIN : Memoire chrono-semantique complete
- [ ] Tests publics et bug bounty

### Phase 3 : Ouverture (2026-2027)
- [ ] API publique
- [ ] Instances federees
- [ ] Gouvernance communautaire formalisee
- [ ] Partenariats academiques
- [ ] Audit externe independant

### Phase 4 : Expansion (2027+)
- [ ] Multilingue complet
- [ ] Domaines specialises (medical, juridique, scientifique)
- [ ] Standard international propose
- [ ] YGGDRASIL comme infrastructure mondiale

---

## Licence

YGGDRASIL est distribue sous [Licence MIT](LICENSE) avec clause copyleft pour les derives.

Le code appartient a l'humanite. Aucune entite ne peut fermer, breveter, ou privatiser YGGDRASIL.

---

## Citation

```bibtex
@software{yggdrasil2024,
  author = {Gelee, Julien and Contributors},
  title = {YGGDRASIL: L'Arbre-Monde de l'Intelligence Artificielle},
  year = {2024},
  url = {https://github.com/Krigsexe/yggdrasil}
}
```

---

<div align="center">

**"Nous ne construisons pas une machine. Nous posons les fondations de la pensee de demain."**

*L'Arbre grandit avec ceux qui le nourrissent.*

[Rejoindre la communaute](https://github.com/Krigsexe/yggdrasil/discussions) | [Signaler un bug](https://github.com/Krigsexe/yggdrasil/issues) | [Proposer une feature](https://github.com/Krigsexe/yggdrasil/issues/new)

</div>
