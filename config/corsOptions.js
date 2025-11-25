const whitelist = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
];



const corsOptions = {
    origin:  (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true, // Add this line
  optionsSuccessStatus: 200
};
  
module.exports = corsOptions;