const whitelist = [
    'http://localhost:3000',     // Node.js client
    'http://localhost:8081',      // Web client
    'http://localhost:19006',     // Expo web
    'http://192.168.56.1:8081',   // המחשב שלך ברשת
    'exp://192.168.56.1:8081',    // Expo Go
  ];
  
const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

export default corsOptions;
