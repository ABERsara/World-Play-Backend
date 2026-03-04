# World-Play Backend Server

Located in `packages/server`, this is the primary API and game orchestration service for the World-Play platform. It manages game logic, user accounts, streaming coordination, real-time updates, and pause/resume game state management through dual-stream architecture.

## Overview

Node.js/Express backend for an interactive live-streaming trivia platform featuring:
- **Real-time Game Logic** via Socket.IO
- **Dual-Stream Architecture** (Moderator + Host/Player streams)
- **Pause/Resume Mechanics** for synchronized game playback
- **WebRTC Streaming** coordination via Mediasoup
- **Payment Processing** with Stripe integration
- **Database Management** via Prisma ORM (PostgreSQL)

## Docker Deployment

### Services

The `docker-compose.yml` at the workspace root includes:

- **app** — This Node.js backend (built from Docker file)
- **db** — PostgreSQL 15 with persistent `postgres_data` volume  
- **media-server** — Mediasoup + FFmpeg service (see `packages/media-server`)

### Prerequisites

- Docker Desktop (Windows, Mac, or Linux) — ensure it's running before docker-compose commands
- `.env` file at workspace root with required variables (see below)

### Environment Variables

Create a `.env` file at the workspace root:

```env
# Server
PORT=8080
NODE_ENV=development

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=world_play_db
DATABASE_URL=postgresql://postgres:postgres@db:5432/world_play_db

# Media Server
MEDIA_PORT=8000
MEDIA_SERVER_URL=http://media-server:8000

# JWT & Security
TOKEN_SECRET=your-secret-key-here

# Stripe (Payment Processing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Common Docker Commands

```powershell
# Build and start all services in background
docker-compose up --build -d

# Watch server logs
docker-compose logs -f app

# Watch media-server logs
docker-compose logs -f media-server

# Open shell in running app container
docker-compose exec app sh

# Run Prisma migrations inside container
docker-compose exec app sh -c "npx prisma migrate dev"

# Generate Prisma client
docker-compose exec app sh -c "npx prisma generate"

# Stop all services
docker-compose down

# Full reset (destroys DB)
docker-compose down -v
docker-compose up --build -d
```

## Local Development

### Prerequisites

- Node.js 16+ and npm/yarn
- PostgreSQL 15 (local or containerized)
- `.env` file (see Environment Variables above)

### Setup

```bash
cd packages/server
npm install
npm start

# Or with hot-reload
npm run dev
```

The server listens on port `8080` by default.

## Database (Prisma)

### Key Models

- **User** — User accounts with authentication
- **Stream** — Broadcast records (status: INITIALIZING → LIVE → PAUSED → FINISHED)
- **Game** — Game session data with pause fields
- **GameParticipant** — Player/host/moderator roles in a game
- **Question** — Trivia questions
- **UserAnswer** — Answer submissions with timestamps
- **Chat** — Game chat messages
- **Notification** — Real-time notifications
- **Transaction** — Payment and economy transactions

### Schema Location

[prisma/schema.prisma](prisma/schema.prisma)

### Common Prisma Commands

```bash
# Generate Prisma client locally
npx prisma generate

# Create new migration
npx prisma migrate dev --name <migration_name>

# Apply existing migrations (production)
npx prisma migrate deploy

# Reset database (development only, destructive)
npx prisma migrate reset

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

## API Routes

### Authentication
- `POST /api/users/auth/register` — User registration
- `POST /api/users/auth/login` — User authentication
- `POST /api/users/auth/logout` — Logout
- `POST /api/users/auth/verify` — Token verification

### User Management
- `GET /api/users/profile` — Current user profile
- `PUT /api/users/profile` — Update user profile
- `GET /api/users/:id` — User details

### Streaming (Dual-Stream Architecture)
- `POST /api/streams` — Create broadcast
- `GET /api/streams/:id` — Stream details
- `GET /api/streams` — List user's streams
- `PATCH /api/streams/:id/pause` — Pause host/player stream (moderator continues)
- `PATCH /api/streams/:id/resume` — Resume paused stream
- `PATCH /api/streams/:id/status` — Update stream status

### Games
- `POST /api/games` — Create game session
- `GET /api/games/:id` — Game details with participants
- `PATCH /api/games/:id/start` — Start game (initializes both streams)
- `PATCH /api/games/:id/pause` — Pause host/player stream during game
- `PATCH /api/games/:id/resume` — Resume after pause
- `PATCH /api/games/:id/finish` — End game session

### Questions
- `GET /api/questions` — List questions
- `POST /api/questions` — Create question
- `POST /api/questions/:id/answers` — Submit answer

### Chat & Notifications
- `GET /api/chat/:streamId` — Chat messages for broadcast
- `POST /api/chat` — Send chat message
- `GET /api/notifications` — User notifications
- `POST /api/notifications/:id/read` — Mark notification as read

### Finance & Payments
- `GET /api/finance/balance` — User account balance
- `GET /api/finance/transactions` — Transaction history
- `POST /api/payments/checkout-session` — Stripe checkout
- `POST /api/payments/webhook` — Stripe webhook handler

### Configuration
- `GET /api/config/media-server` — Media-server connection config
- `GET /api/config/app-settings` — App settings and features

### Status
- `GET /` — API health check
- `GET /api/status` — Detailed service status

## Real-Time Events (Socket.IO)

### Stream Events
- `stream:init_broadcast` — Start broadcast
- `stream:create_room` — Initialize media rooms
- `stream:produce` — Producer creates media (role-based: MODERATOR, HOST, PLAYER)
- `stream:consume` — Consumer requests media
- `stream:pause` — Host/player stream pauses
- `stream:resume` — Host/player stream resumes
- `stream:ended` — Broadcast finished

### Game Events
- `game:started` — Game session begins
- `game:paused` — Pause event (host/player stream paused)
- `game:resumed` — Resume event (streams resume)
- `game:question_updated` — New question sent to players
- `game:answer_submitted` — Player answer received
- `game:finished` — Game session ended

### Chat & Notifications
- `chat:message` — New chat message
- `notification:received` — New notification for user
- `notification:read` — Notification marked as read

## Dual-Stream Architecture

### Why Two Streams?

The system maintains separate streams for different user roles to support pause logic:

1. **Moderator Stream** (always live)
   - Continuous feed for game moderator
   - Not affected by pause events
   - Used for administrative monitoring

2. **Host/Player Stream** (pausable)
   - Media from hosts and players
   - Can be paused for game logic
   - Recorded for replay/analysis
   - May include HLS pause points

### Pause Logic Flow

```
Game starts
    ↓
stream:init_broadcast (creates dual routers)
    ↓
Moderator produces → MODERATOR router (always live)
Host produces → HOST/PLAYER router + FFmpeg recording
Players produce → HOST/PLAYER router
    ↓
During game, if pause event:
    ↓
HOST/PLAYER stream pauses (FFmpeg pauses)
MODERATOR stream continues live
    ↓
Game logic triggered (time stops, answers locked)
    ↓
Resume event:
    ↓
Both streams resume in sync
```

### Server Role in Dual-Stream

- Creates game session with pause field tracking
- Triggers `stream:pause` and `stream:resume` Socket.IO events
- Validates game state before pause/resume
- Records pause/resume timestamps in `Game` model
- Maintains participant standings during pauses

## Code Quality & Standards

### Tools

- **ESLint** — Code quality and linting
- **Prettier** — Code formatting
- **Husky** — Git hooks automation
- **lint-staged** — Pre-commit checks

### Pre-Commit Workflow

Every `git commit` automatically runs:

1. **ESLint check** (`npm run lint`)
   - Detects code quality issues
   - Blocks commit if critical errors found
   - Auto-fixes simple issues with `lint:fix`

2. **Prettier format** (`npm run format`)
   - Enforces consistent code style
   - Indentation, quotes, semicolons, etc.

### Manual Commands

```bash
# Check all files for issues
npm run lint

# Auto-fix all fixable errors
npm run lint:fix

# Format entire codebase
npm run format
```

### Best Practices

- Run `npm run lint:fix && npm run format` before committing
- Use meaningful commit messages
- Keep functions focused and testable
- Add comments for complex game logic
- Follow existing code patterns in the codebase

## Integration with Media Server

The server communicates with the media-server package to coordinate streaming:

- **Initiates Broadcasts** — Calls media-server Socket.IO events
- **Stream Metadata** — Stores stream IDs and status in DB
- **Pause Coordination** — Triggers pause/resume on media-server
- **Recording Management** — Manages HLS segment storage and cleanup
- **Role Validation** — Validates participants before media production

See [packages/media-server/README.md](../media-server/README.md) for media server details.

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module '/usr/src/app/src/index.js'" | Verify `package.json` main field points to correct entry file |
| Database connection refused | Ensure `DATABASE_URL` is correct and PostgreSQL is running |
| Prisma client not found | Run `npx prisma generate` to generate client |
| Media-server connection failed | Check `MEDIA_SERVER_URL` and ensure media-server container is running |
| "Token not provided" on Socket.IO | Ensure valid JWT token is sent in socket auth handshake |
| Pause not working correctly | Check that game has HOST/PLAYER participants with correct roles in DB |

### Database Issues

```bash
# Rebuild Prisma client
npx prisma generate

# Check database connection
npx prisma db push

# View database with Prisma Studio
npx prisma studio

# Reset database (development only)
npx prisma migrate reset
```

### Logs & Debugging

```bash
# View server logs in Docker
docker-compose logs -f app

# View database logs
docker-compose logs -f db

# View media-server logs
docker-compose logs -f media-server

# View all logs
docker-compose logs -f
```

## Performance & Scalability

- **Connection Limits** — Configure Socket.IO adapter for horizontal scaling
- **Database Optimization** — Add indexes on frequently queried fields (userId, streamId, gameId)
- **Stream Recording** — HLS segments stored locally; plan storage for production
- **Real-time Events** — Use Redis adapter for multi-server Socket.IO deployments
- **API Rate Limiting** — Consider adding rate limits for payment/auth endpoints

## Security Considerations

- **JWT Tokens** — Set `TOKEN_SECRET` to a strong value
- **CORS** — Currently allows all origins (`*`) for development; restrict in production  
- **Database** — Use strong PostgreSQL passwords; don't expose credentials
- **Stripe** — Keep webhook secret secure; validate all webhook signatures
- **Stream Access** — Enforce role-based authorization before streaming

## Notes for Production

- Set `NODE_ENV=production`
- Use strong `TOKEN_SECRET` and Stripe keys
- Enable HTTPS/TLS for all connections
- Set up database backups
- Monitor CPU/memory usage of media-server (especially FFmpeg)
- Implement HLS segment cleanup/retention policies
- Use external CDN for HLS streaming
- Add application monitoring and error tracking
- Implement rate limiting on public endpoints
- Use environment-based configuration management

---

For more details:
- [Media Server](../media-server/README.md) — WebRTC and FFmpeg streaming
- [Client](../client/README.md) — Frontend application
- [Shared](../shared/README.md) — Shared types and utilities
- [Database Schema](prisma/schema.prisma) — Data models and relationships
