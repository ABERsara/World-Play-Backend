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
  const transport = await router.createPlainTransport({
    // מאזינים ל-Localhost כי ה-FFmpeg רץ על אותו שרת (או בתוך אותו קומפוז)
    listenIp: { ip: '127.0.0.1', announcedIp: null },
    rtcpMux: false, // הגדרה סטנדרטית לעבודה עם FFmpeg
    comedia: true, // מאפשר לטרנספורט לזהות אוטומטית מאיפה FFmpeg משדר
  });

  return transport;
};
