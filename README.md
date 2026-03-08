# World-Play MonoRepo

This repository contains the full-stack code for **World‑Play**, a real-time interactive platform built as a monorepo. All major components are managed under the `packages/` directory to enable shared code, synchronized versioning, and simplified dev workflows.

---

##  Structure

```
docker-compose.yml
packages/
  client/           # Expo / React Native frontend
  media-server/     # Media processing & streaming service (ffmpeg + Mediasoup)
  server/           # Node/Express API, game logic, sockets, payments, Prisma DB
  shared/           # Common utilities & validation schemas
```

Each folder contains its own `package.json`, configuration files (tsconfig, linting), and documentation. See the package-level README.md files for details.

---

##  Getting Started (Monorepo-wide)

1. **Prerequisites**
   - Node.js v16+
   - Docker & Docker Compose
   - Yarn or npm

2. **Install dependencies**
   ```bash
   yarn install        # or npm install at repo root
   ```

3. **Build & run full stack**
   ```bash
   docker-compose up -d --build
   ```

   Containers:
   - `client` (if configured)
   - `media-server` – handles live stream ingestion
   - `server` – API & game backend
   - `postgres` – database for server package

4. **Individual package development**
   ```bash
   cd packages/client && yarn start
   cd packages/media-server && yarn start
   cd packages/server && yarn start
   ```

   Each package README includes further details for dev commands.

---

##  Package Overview

| Package         | Purpose                                                                 |
|----------------|------------------------------------------------------------------------|
| `client`       | Expo mobile UI; uses shared schemas/services                   |
| `media-server` | Live stream processing, recording, HLS output, poster generation       |
| `server`       | REST API, socket handlers, Prisma migrations, payment integration      |
| `shared`       | Reusable utilities such as Zod schemas used across other packages      |

---

## ❗ Notes

- Shared libraries are published via relative workspace references (`"workspace:*"` in `package.json`).
- Keep Prisma client up to date by running `npx prisma generate` when migrations change (see `packages/server/` README).
- Use `docker exec` to explore running services or volumes (e.g. inspect `public/streams` in media-server container).

---

For further documentation, refer to the package-specific README files. This README was generated on **February 22, 2026** and should be updated as the project evolves.
