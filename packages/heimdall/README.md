# HEIMDALL

> *"Heimdall voit a cent lieues, de jour comme de nuit. Il entend l'herbe pousser sur la terre et la laine sur les moutons."*

## Description

HEIMDALL est le **Gateway** de YGGDRASIL — le gardien qui protege l'entree de l'Arbre-Monde.

## Responsabilites

- **Authentification** — JWT, OAuth2/OIDC
- **Rate Limiting** — Protection contre les abus
- **Audit Logging** — Tracabilite de toutes les requetes
- **TLS/mTLS** — Chiffrement des communications
- **Validation** — Verification des entrees

## Installation

```bash
pnpm install
```

## Developpement

```bash
# Demarrer en mode watch
pnpm dev

# Lancer les tests
pnpm test

# Build
pnpm build
```

## Configuration

Variables d'environnement :

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port d'ecoute | `3000` |
| `JWT_SECRET` | Cle secrete JWT | — |
| `JWT_EXPIRY` | Duree de validite | `15m` |
| `REDIS_URL` | URL Redis | `redis://localhost:6379` |
| `RATE_LIMIT_TTL` | Fenetre de rate limit | `60` |
| `RATE_LIMIT_MAX` | Requetes max par fenetre | `100` |

## API

### Authentification

```
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

### Health

```
GET /health
GET /health/ready
GET /health/live
```

## Architecture

```
heimdall/
├── src/
│   ├── main.ts              # Entry point
│   ├── app.module.ts        # Root module
│   ├── auth/                # Authentication
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── jwt.strategy.ts
│   │   └── guards/
│   ├── rate-limit/          # Rate limiting
│   │   └── rate-limit.module.ts
│   ├── audit/               # Audit logging
│   │   ├── audit.module.ts
│   │   ├── audit.service.ts
│   │   └── audit.interceptor.ts
│   └── health/              # Health checks
│       └── health.controller.ts
└── test/
    └── ...
```

## Securite

HEIMDALL implemente les protections suivantes :

- Helmet (headers de securite)
- CORS strict
- Rate limiting par IP et par utilisateur
- Validation des entrees (class-validator)
- Sanitization des sorties
- Audit immutable

---

<div align="center">

*"Je suis le gardien. Nul ne passe sans etre vu."*

</div>
