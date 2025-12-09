module.exports = (io, socket) => {
  // --- 1. הצטרפות לחדר (join_room) ---
  socket.on('join_room', (data, callback) => {
    // data = { gameId: "UUID" }
    const { gameId } = data;

    if (!gameId) {
      // אם הקליינט שלח callback לטיפול בשגיאות
      if (typeof callback === 'function')
        callback({ status: 'error', msg: 'Missing gameId' });
      return;
    }

    // הצטרפות פיזית לחדר של Socket.io
    socket.join(gameId);
    console.log(`User ${socket.user.username} joined room: ${gameId}`);

    // שליחת אישור לקליינט שהצליח להתחבר
    if (typeof callback === 'function') {
      callback({
        status: 'ok',
        msg: `Joined room ${gameId}`,
        viewerCount: io.sockets.adapter.rooms.get(gameId)?.size || 0,
      });
    }

    // אופציונלי: עדכון כל החדר שמישהו הצטרף (תלוי אם רוצים להציף את הצ'אט)
    // socket.to(gameId).emit('user_joined', { userId: socket.user.id });
  });

  // --- 2. טיפול בניתוק ---
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.id}`);
    // כאן אפשר להוסיף לוגיקה של עדכון DB על זמן יציאה (עבור ViewLogs)
  });
};
