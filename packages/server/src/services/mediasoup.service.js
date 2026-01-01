// src/services/mediasoup.service.js
import mediasoup from 'mediasoup';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let workers = [];
let nextWorkerIdx = 0;

// 1. אתחול ה-Workers
export const createWorkers = async () => {
  logger.info(`Starting ${config.mediasoup.numWorkers} Mediasoup workers...`);

  for (let i = 0; i < config.mediasoup.numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.worker.logLevel,
      logTags: config.mediasoup.worker.logTags,
      rtcMinPort: config.mediasoup.worker.rtcMinPort,
      rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
    });

    worker.on('died', () => {
      logger.error(`Worker ${worker.pid} died, exiting...`);
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
  }
};

// 2. קבלת Worker
export const getWorker = () => {
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
};

// 3. יצירת Router
export const createRouter = async (worker) => {
  return await worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
};

// 4. יצירת Transport
export const createWebRtcTransport = async (router) => {
  const transport = await router.createWebRtcTransport({
    listenIps: config.mediasoup.webRtcTransport.listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
  });

  return transport;
};