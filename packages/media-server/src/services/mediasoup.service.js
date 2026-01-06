import mediasoup from 'mediasoup';
import { config } from '../config.js';

let workers = [];
let nextWorkerIdx = 0;

export const createWorkers = async () => {
  for (let i = 0; i < config.mediasoup.numWorkers; i++) {
    const worker = await mediasoup.createWorker(config.mediasoup.worker);
    worker.on('died', () => {
      setTimeout(() => process.exit(1), 2000);
    });
    workers.push(worker);
  }
};

export const getWorker = () => {
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
};

export const createRouter = async (worker) => {
  return await worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
};

export const createWebRtcTransport = async (router) => {
  return await router.createWebRtcTransport(config.mediasoup.webRtcTransport);
};