# Media Server Package

Located at `packages/media-server` within the monorepo, this service is responsible for handling live media streams using **Mediasoup** and **FFmpeg**. It manages real-time streaming via WebRTC and records streams for playback and game pause logic.

## Key Features

- **Socket.IO Server** — Real-time WebRTC signaling and stream management
- **Mediasoup (SFU)** — Selective Forwarding Unit for efficient WebRTC media routing
- **Dual Stream Architecture** — Separate streams for moderator (always live) and host/players (recordable)
- **FFmpeg Integration** — Transcodes streams to HLS format with segmentation
- **Pause Logic Support** — Records host/player stream for game pause and replay functionality
- **Docker Support** — Fully containerized and orchestrated via root `docker-compose.yml`
- **JWT Authentication** — Secure socket connections via token validation

## Architecture Overview

### Dual Stream System

The system maintains two independent stream types per broadcast:

#### 1. **Moderator Stream** (`MODERATOR`)
- Single continuous stream for the game moderator
- Always live during the broadcast
- Not paused by game logic
- Provides game control and observation feed
- Uses separate Mediasoup router from host/player stream

#### 2. **Host/Player Stream** (`HOST`, `PLAYER`)
- Stream for hosts and players participating in the game
- Supports pause logic for game mechanics
- Recorded via FFmpeg for replay and analysis
- Can be paused/resumed without affecting moderator feed
- Allows for synchronized game state management

### Component Structure

- **`index.js`** — Express server with Socket.IO and HTTP initialization
- **`src/sockets/stream.handler.js`** — WebRTC signaling and lifecycle management for dual streams
- **`src/services/mediasoup.service.js`** — Mediasoup worker/router initialization and transport creation
- **`src/services/stream.service.js`** — FFmpeg orchestration for HLS transcoding and recording
- **`src/middleware/socketAuth.js`** — JWT token validation middleware
- **`src/routes/status.routes.js`** — Health check and status endpoints
- **`src/utils/logger.js`** — Centralized logging utility

### Primary Socket Events

#### Stream Initialization

| Event | Purpose |
|-------|---------|
| `stream:init_broadcast` | Create broadcast record with dual-stream setup |
| `stream:create_room` | Initialize stream room (creates routers for both streams) |

#### Transport Management

| Event | Purpose |
|-------|---------|
| `stream:create_transport` | Create WebRTC transport for producer/consumer |
| `stream:connect_transport` | Establish DTLS connection |

#### Media Production

| Event | Purpose |
|-------|---------|
| `stream:produce` | Create media producer; role determines stream assignment |
| `stream:consume` | Request media consumption from specific stream |
| `stream:join` | Join broadcast and get access to appropriate stream(s) |

#### Stream Control

| Event | Purpose |
|-------|---------|
| `stream:pause` | Pause host/player stream (moderator stream continues) |
| `stream:resume` | Resume paused host/player stream |
| `stream:ended` | Broadcast ended; cleanup streams and routers |

## Development

### Prerequisites

- Node.js 16+ and npm/yarn
- Docker & Docker Compose (for containerized development)
- Running Postgres database (via docker-compose or local)

### Local Setup

```bash
cd packages/media-server
npm install
npm start
```

The server listens on port `MEDIA_PORT` (default: 8000) for Socket.IO connections.

### Docker Build & Run

```bash
# From workspace root
docker-compose up -d --build media-server
```

### Inspecting Stream Files

```bash
# List generated HLS segments and recordings
docker exec -it world-play-monorepo-media-server-1 ls -R public/streams
```

## Configuration

### Environment Variables

Set these in your `.env` file (at workspace root):

```env
MEDIA_PORT=8000                    # Server listening port
TOKEN_SECRET=<your-jwt-secret>     # JWT signing secret
DATABASE_URL=postgresql://...      # Prisma database connection
```

### Stream Configuration

Adjust FFmpeg settings in `src/services/stream.service.js`:

- `TEMP_DIR` — Temporary directory for FFmpeg output
- `PUBLIC_DIR` — Public directory for HLS segments
- `SEGMENT_DURATION` — HLS segment duration in seconds
- `BITRATE_SETTINGS` — Video and audio bitrate targets

## Stream Lifecycle

### 1. Broadcast Initialization
```
stream:init_broadcast
    ↓
Server creates stream record in DB (status: INITIALIZING)
```

### 2. Room Setup
```
stream:create_room
    ↓
Creates two Mediasoup routers:
  - MODERATOR router
  - HOST/PLAYER router
```

### 3. Producer Registration
```
Client sends stream:produce with role
    ↓
Validate participant role (MODERATOR, HOST, or PLAYER)
    ↓
Role-based actions:
  - MODERATOR: Creates producer on MODERATOR router
  - HOST/PLAYER: Creates producer on HOST/PLAYER router + launches FFmpeg
```

### 4. Pause Logic (Host/Player Stream Only)
```
stream:pause event
    ↓
FFmpeg pauses HOST/PLAYER stream recording
    ↓
Moderator stream continues unaffected
    ↓
stream:resume event
    ↓
FFmpeg resumes recording
```

### 5. Consumer Phase
```
Viewer requests stream:consume
    ↓
Gets media from appropriate router (based on role/permissions)
    ↓
Consumer created on relevant stream
```

### 6. Cleanup
```
Host disconnects or stream:ended
    ↓
Both routers closed
    ↓
FFmpeg processes terminated
    ↓
Stream marked as FINISHED in DB
```

## Integration with Other Packages

### Client Package
- Connects via Socket.IO with JWT token
- Initiates `stream:init_broadcast` to start broadcasting
- Produces media stream based on user role (MODERATOR, HOST, or PLAYER)
- Consumes streams from appropriate routers
- Handles pause/resume events for game logic

### Server Package (Main API)
- Creates stream records with dual-stream configuration
- Validates user roles via `gameParticipant` records
- Manages stream status (LIVE, PAUSED, FINISHED)
- Triggers pause/resume events based on game state
- Stores HLS segments for VOD playback

### Shared Package
- Provides enums: `UserRole`, `StreamStatus`, `GameStatus`
- Type definitions for stream metadata
- Validation schemas for socket events

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Transport not found" | Ensure `stream:create_transport` called before `stream:produce` |
| Moderator stream stops on pause | Check that MODERATOR and HOST/PLAYER routers are separate |
| FFmpeg not recording | Verify role in DB; must be HOST or PLAYER |
| "canConsume failed" | Ensure consumer's RTC capabilities match producer's |
| High CPU usage | Lower FFmpeg bitrate or frame rate in stream.service.js |

## Performance Considerations

- **Two Routers = Double Resource Usage** — Allocate adequate CPU and memory for dual streams
- **FFmpeg Transcoding** — CPU-intensive; consider hardware acceleration if available
- **Pause/Resume Overhead** — Pausing FFmpeg writes segment boundaries; monitor disk I/O
- **WebRTC Transports** — Each participant creates transports on both routers if needed
- **Memory Cleanup** — Long-running streams require explicit consumer/transport cleanup

## Notes for Production

- Implement HLS segment retention/cleanup per stream
- Add metrics logging for each router (MODERATOR vs HOST/PLAYER)
- Monitor FFmpeg process health separately for each stream type
- Implement graceful shutdown for both routers
- Consider CDN integration for HLS distribution
- Plan storage allocation for dual-stream recordings
- Add monitoring for pause/resume event timing accuracy

## Security Considerations

- **Role Validation** — Ensure user role matches DB records before stream assignment
- **Token Validation** — JWT tokens must be present and valid for all socket connections
- **Transport Cleanup** — Expired or disconnected transports should be removed to prevent memory leaks
- **Stream Isolation** — MODERATOR and HOST/PLAYER streams should not cross-consume media without explicit authorization

---

For detailed implementation:
- WebRTC Flow: `src/sockets/stream.handler.js`
- Mediasoup Setup: `src/services/mediasoup.service.js`
- FFmpeg & Recording: `src/services/stream.service.js`
- Stream Schema: `prisma/schema.prisma` (Stream, GameParticipant models)
