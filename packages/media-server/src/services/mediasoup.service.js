import mediasoup from 'mediasoup';
import { config } from '../config.js';

const workers = [];
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

export const createRouter = (worker) => {
  return worker.createRouter({
    mediaCodecs: config.mediasoup.router.mediaCodecs,
  });
};

export const createWebRtcTransport = (router) => {
  return router.createWebRtcTransport(config.mediasoup.webRtcTransport);
};

export const createPlainTransport = async (router) => {
  console.log('--- Starting createPlainTransport ---');
  try {
    const transport = await router.createPlainTransport({
      // שינוי ל-0.0.0.0 כדי שיקשיב לכל החיבורים בתוך הדוקר
      listenIp: {
        ip: '0.0.0.0',
        announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
      },
      rtcpMux: false,
      comedia: true,
    });
    console.log('--- PlainTransport created successfully ---');
    return transport;
  } catch (error) {
    console.error('❌ Error in createPlainTransport:', error);
    throw error;
  }
};
