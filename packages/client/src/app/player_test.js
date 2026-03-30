import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import { socket, emitPromise } from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';

function PlayerTestScreen() {
  const [status, setStatus] = useState('ממתין...');
  const [remoteStreams, setRemoteStreams] = useState([]);
  const streamId = 'live_game_test_123';

  useEffect(() => {
    const handleNewProducer = async ({ producerId, role }) => {
      console.log(`מפיק חדש: ${role}`);
      handleConsume(producerId, role);
    };

    socket.on('stream:new_producer', handleNewProducer);
    return () => socket.off('stream:new_producer', handleNewProducer);
  }, []);

  const handleJoinAndStream = async () => {
    try {
      setStatus('מתחבר...');
      const data = await emitPromise('stream:join', {
        streamId,
        role: 'PLAYER',
      });
      await MediasoupManager.initDevice(data.rtpCapabilities);

      if (data.currentProducers) {
        for (const p of data.currentProducers) {
          await handleConsume(p.producerId, p.role);
        }
      }
      setStatus('משדר וצופה! 🟢');
    } catch (err) {
      setStatus('שגיאה: ' + err.message);
    }
  };

  const handleConsume = async (producerId, role) => {
    try {
      const recvTransport = await MediasoupManager.createTransport(
        socket,
        'recv',
        streamId
      );
      const consumeData = await emitPromise('stream:consume', {
        transportId: recvTransport.id,
        producerId,
        rtpCapabilities: MediasoupManager.getRtpCapabilities(),
        streamId,
      });

      const consumer = await recvTransport.consume(consumeData);
      // הערה: MediaStream לא קיים ב-Native ישירות ללא הייבוא של webrtc
      // אז אנחנו שומרים את ה-track לבינתיים
      setRemoteStreams((prev) => [...prev, { id: consumer.id, role }]);
      await emitPromise('stream:resume', { consumerId: consumer.id, streamId });
    } catch (e) {
      console.error('Consume failed', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>

      <Text style={styles.label}>אני (שחקן):</Text>
      <View style={styles.localVideoBox}>
        <Text style={{ color: '#fff', textAlign: 'center', paddingTop: 50 }}>
          WebRTC Disabled
        </Text>
      </View>

      <Text style={styles.label}>שידור מהמארח:</Text>
      <ScrollView horizontal style={styles.remoteList}>
        {remoteStreams.map((item) => (
          <View key={item.id} style={styles.remoteVideoBox}>
            <Text
              style={{ color: '#fff', textAlign: 'center', paddingTop: 50 }}
            >
              WebRTC Disabled
            </Text>
            <Text style={styles.roleTag}>{item.role}</Text>
          </View>
        ))}
      </ScrollView>

      <Button title="הצטרף למשחק" onPress={handleJoinAndStream} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 15 },
  status: { color: '#ffa502', marginBottom: 10 },
  label: { color: '#fff', marginTop: 10 },
  localVideoBox: { width: 120, height: 160, backgroundColor: '#000' },
  remoteVideoBox: {
    width: 280,
    height: 180,
    backgroundColor: '#000',
    marginRight: 10,
  },
  video: { width: '100%', height: '100%' },
  remoteList: { marginTop: 10 },
  roleTag: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    color: '#fff',
    backgroundColor: 'red',
    padding: 2,
  },
});

export default function Page() {
  return <PlayerTestScreen />;
}
