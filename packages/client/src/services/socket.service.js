import { io } from "socket.io-client";

// ⚠️ חשוב: שני את ה-URL בהתאם למכשיר שלך!
// אימולטור אנדרואיד: "http://10.0.2.2:8080"
// מכשיר אמיתי: ה-IP של המחשב שלך, למשל "http://192.168.1.20:8080"
// סימולטור אייפון: "http://localhost:8080"

const SOCKET_URL = "http://10.0.2.2:8080"; 

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: false,
});