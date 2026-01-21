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

// טרנספורט עבור FFmpeg (מוציא מידע מהשרת לעצמו)
export const createPlainTransportForFFmpeg = async (router) => {
  const transport = await router.createPlainTransport({
    listenIp: { ip: '127.0.0.1' }, // FFmpeg רץ מקומית
    rtcpMux: false,
    comedia: false, // אנחנו נגיד לו לאיזה פורט לשלוח
  });
  return transport;
};

// טרנספורט עבור הקליינטים (שחקנים/מנחה)
export const createWebRtcTransport = (router) => {
  return router.createWebRtcTransport(config.mediasoup.webRtcTransport);
};
