# World-Play-Backend

Node.js backend for an interactive live-streaming trivia platform featuring real-time game logic via Socket.io and WebRTC.

# Docker

<<<<<<< HEAD

## Prisma

npx prisma studio- אפשרות לראות את השרת בניתוב - בעצם כמו שפתחנו את המונגו DB

npx prisma migrate dev --name init_user_table - ליצירת טבלאות בשביל שבעצם הם יוצרות גם בSQL והיה אפשר להשמש במודלים שכתבנו הPRISMA

=======
This repo includes a docker-compose setup with two services:

> > > > > > > main

- app — your Node.js backend (built from the Dockerfile)
- db — PostgreSQL 15 with persistent volume `postgres_data`

## Prerequisites

- Docker Desktop (Windows) — ensure Docker is running before using docker-compose.
- A `.env` file at the project root (see `.env.example` below).

.env example
// filepath: c:\World-Play-Backend\.env.example

POSTGRES_USER=postgres

POSTGRES_PASSWORD=postgres

POSTGRES_DB=world_play_db

PORT=3000

## Common Docker commands (PowerShell):

1.Build and run in background: docker-compose up --build -d

2.Watch backend logs: docker-compose logs world_play_app_backend

3.Open a shell in the running app container: docker-compose exec app sh

4.Run prisma generate inside the running container: docker-compose exec app sh -c "npx prisma generate"

5.Stop and remove containers and volumes (destroys DB data):
docker-compose down -v

6.Rebuild images and start fresh:docker-compose down --rmi all --volumes
docker-compose up --build -d

Notes and troubleshooting

If you see "Cannot find module '/usr/src/app/src/index.js'":
Confirm the app entry file path (package.json "main" / "start" script).
If using TypeScript, run npm run build in the image and run dist/... (or run build on host and mount).

The bind mount - .:/usr/src/app in docker-compose will override files that were created during the image build (e.g., dist/ or generated Prisma client). If you rely on build artifacts from the image, remove the - .:/usr/src/app bind mount or change it to only mount node_modules.
Prisma requires environment variable DATABASE_URL. When running migrations or generating client inside containers, the .env must be present in the container or DATABASE_URL provided via docker-compose environment.

# Prisma

Generate client:

Local (host): npx prisma generate
In container: docker-compose exec app sh -c "npx prisma generate"
Apply migrations:

## Development: npx prisma migrate dev

Production (apply existing migrations): npx prisma migrate deploy
Reset DB (dev, destructive): npx prisma migrate reset
Run these commands either on your host (with a reachable DB) or inside the app container.

## Running the app

Development (if you have a dev script like nodemon):
npm run dev
Production run from container (image built with start script): docker-compose up --build -d
If your project is TypeScript, ensure Dockerfile runs npm run build during image build and that CMD points to the built file (e.g., node dist/index.js).

# Code Quality and Standards:

This project enforces strict code quality and formatting standards using ESLint and Prettier. This ensures consistency across the codebase, making the code easier to read, maintain, and collaborate on.
Automation (Git Hooks) To prevent code with style errors or critical issues from entering the repository, we use Husky and lint-staged.

## Pre-Commit Hook: Before every git commit, the system automatically runs the following process on all staged files (git add .):

npm run lint:
fix: Automatically fixes simple, auto-fixable ESLint errors (e.g., unused variables that can be removed).
npm run format: Runs Prettier to enforce consistent code styling (e.g., indentation, semicolons, single quotes).
Note: If any critical, non-fixable ESLint errors are detected, the commit will be blocked until the errors are resolved manually.

## Manual Commands:

Developers should use the following commands regularly during development:Command,Description
npm run lint, Runs ESLint to check for all code quality and logical issues.
npm run lint:fix, Runs ESLint and automatically fixes all fixable errors.
npm run format, Runs Prettier to reformat and style the entire codebase.
