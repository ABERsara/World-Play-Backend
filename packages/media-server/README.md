# Media Server Package

Located at `packages/media-server` within the monorepo, this service is responsible for handling live media streams using **Mediasoup** and **FFmpeg**. It receives real-time streams from clients (via WebRTC), records them, and generates HLS chunks with a poster image for playback.

##  Key Features

- Simple Express HTTP API and Socket.IO handlers (see `src/`)
- `StreamService` orchestrates Mediasoup transports, consumers, and spawns FFmpeg to transcode streams into HLS
- Recorded segments are stored under `public/streams/<streamId>` inside the container
- Dockerized via `packages/media-server/Dockerfile` and included in root `docker-compose.yml`

##  Development

1. Install dependencies
   ```bash
   cd packages/media-server
   yarn install  # or npm install
   ```

2. Start locally (requires a running DB or mock depending on configuration)
   ```bash
   yarn start    # or node src/index.js
   ```

3. To inspect generated streams:
   ```bash
   docker exec -it world-play-monorepo-media-server-1 ls -R public/streams
   ```

4. Adjust `TEMP_DIR` and other constants in `src/services/stream.service.js` as needed.

##  Docker

The service is built into the `media-server` image defined in `docker-compose.yml`. Build & run with:

```bash
docker-compose up -d --build media-server
```

##  Integration

Other packages (client & server) communicate with media-server via socket events and HTTP routes when initiating streams. Shared validation schemas are imported from `packages/shared` where appropriate.

##  Notes

- Ports used internally for FFmpeg (e.g. 5004) must be open within the container network.
- The code currently writes static HLS playlists; consider adding retention/cleanup logic for production.

---

> For more implementation details, browse the `src/` folder and refer to `services/mediasoup.service.js`.
