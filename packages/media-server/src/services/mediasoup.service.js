// packages/media-server/src/services/mediasoup.service.js

import mediasoup from 'mediasoup';
import { config } from '../config.js';

const workers = [];
let nextWorkerIdx = 0;

export const createWorkers = async () => {
  for (let i = 0; i < config.mediasoup.numWorkers; i++) {
    const worker = await mediasoup.createWorker(config.mediasoup.worker);
    worker.on('died', () => setTimeout(() => process.exit(1), 2000));
    workers.push(worker);
  }
};

export const getWorker = () => {
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
};

export const createRouter = (worker) => {
  return worker.createRouter({
    mediaCodecs: config.mediasoup.router.mediaCodecs,
  });
};
/**
 * טרנספורט עבור FFmpeg (Stream B) (שחקנים אחרים) -
 * מוציא מידע מהשרת לעצמו בתוך הרשת הפנימית
 */
export const createPlainTransportForFFmpeg = async (router) => {
  const transport = await router.createPlainTransport({
    listenIp: {
      ip: '0.0.0.0',
      announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
    },
    rtcpMux: false,
    comedia: true,
  });
  return transport;
};

// טרנספורט עבור הקליינטים (מנחה - Stream A)
export const createWebRtcTransport = (router) => {
  return router.createWebRtcTransport(config.mediasoup.webRtcTransport);
};
