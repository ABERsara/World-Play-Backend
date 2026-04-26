const devOrigins = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006',
];

const prodOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

const whitelist = [...devOrigins, ...prodOrigins];

const corsOptions = {
  origin: (origin, callback) => {
    // null origin = mobile app (React Native) or server-to-server call
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

export default corsOptions;
