// packages/shared/src/constants/socketEvents.js

export const SOCKET_EVENTS = {
  // אירועי מערכת כלליים
  SYSTEM: {
    DISCONNECT: 'disconnect',
    ERROR: 'error',
  },
  // משחק (App-Server)
  GAME: {
    CREATE: 'game:create',
    JOIN: 'game:join_room',
    PLACE_BET: 'game:place_bet',
    STATUS_UPDATE: 'game:status_update',
    ROOM_UPDATE: 'game:room_update',
    ERROR: 'game:error',
  },

  // מדיה (Media-Server / Mediasoup)
  STREAM: {
    CREATE_ROOM: 'stream:create_room',
    INIT_BROADCAST: 'stream:init_broadcast',
    CREATE_TRANSPORT: 'stream:create_transport',
    CONNECT_TRANSPORT: 'stream:connect_transport',
    PRODUCE: 'stream:produce',
    CONSUME: 'stream:consume',
    JOIN: 'stream:join',
    START_RECORDING: 'stream:start_recording',
    ENDED: 'stream:ended',
  },
};
