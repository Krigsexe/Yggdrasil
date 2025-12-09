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

### Le Conseil (THING)

| Membre | Specialite | Modele |
|--------|------------|--------|
| **KVASIR** | Raisonnement profond | Claude |
| **BRAGI** | Creativite, eloquence | Grok |
| **NORNES** | Calcul, logique formelle | DeepSeek |
| **SAGA** | Connaissance generale | Llama |
| **LOKI** | Critique, adversarial | Red team |
| **TYR** | Arbitrage, consensus | Voting system |

---

## Quick Start

```bash
# Cloner le repository
git clone https://github.com/Krigsexe/yggdrasil.git
cd yggdrasil

# Installation
pnpm install

# Configuration
cp .env.example .env
# Editer .env avec vos cles API

# Lancement en developpement
pnpm dev
```

### Avec Docker

```bash
docker-compose up -d
```

### Auto-hebergement complet (avec Ollama pour modeles locaux)

```bash
# Mode souverain — aucune donnee ne quitte votre infrastructure
pnpm run sovereign
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
- [ ] Documentation complete
- [ ] Premiers contributeurs
- [ ] Tests et validation

### Phase 2 : Construction (2025-2026)
- [ ] MIMIR : Integration sources scientifiques (arXiv, PubMed)
- [ ] THING : Consortium multi-modeles fonctionnel
- [ ] ODIN : Maestro avec validation 100%
- [ ] MUNIN : Memoire chrono-semantique
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
