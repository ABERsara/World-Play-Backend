import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { socket } from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';

export default function PlayerScreen({ streamId }) {
  const [remoteStreams, setRemoteStreams] = useState([]); // שאר השחקנים

  useEffect(() => {
    // 1. השחקן פותח מצלמה מיד עם הכניסה
    startMyCamera();

    // 2. האזנה לשחקנים אחרים שמצטרפים לגריד
    socket.on('stream:new_producer', async ({ producerId, role }) => {
      const stream = await consumeStream(producerId);
      setRemoteStreams(prev => [...prev, { id: producerId, stream, role }]);
    });

    return () => socket.off('stream:new_producer');
  }, []);

  return (
    <View style={styles.container}>
      {/* גריד וידאו - שחקנים אחרים ומארח */}
      <View style={styles.grid}>
        {remoteStreams.map(item => (
          <View key={item.id} style={styles.videoWrapper}>
            <VideoView stream={item.stream} style={styles.video} />
            <Text style={styles.playerName}>{item.role}</Text>
          </View>
        ))}
      </View>

      {/* וידאו עצמי קטן (Preview) */}
      <View style={styles.selfPreview}>
         <LocalVideoView />
      </View>

      {/* עיגול מנחה מרחף - תמיד מופיע לשחקן כדי שישמע הנחיות */}
      <ModeratorCircle />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  videoWrapper: { width: '50%', height: '50%', borderWidth: 1, borderColor: '#333' },
  video: { width: '100%', height: '100%' },
  selfPreview: { position: 'absolute', bottom: 20, right: 20, width: 100, height: 150, borderRadius: 10, overflow: 'hidden' },
  playerName: { position: 'absolute', bottom: 5, left: 5, color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', padding: 2 }
});