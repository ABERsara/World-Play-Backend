import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
// import { RTCView, mediaDevices } from 'react-native-webrtc'; 
import { socket, emitPromise } from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';

function PlayerTestScreen() {
  const [status, setStatus] = useState('ממתין...');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); 
  const streamId = "live_game_test_123"; // חייב להיות תואם למארח

  useEffect(() => {
    socket.on('stream:new_producer', async ({ producerId, role }) => {
      console.log(`מפיק חדש: ${role}`);
      handleConsume(producerId, role);
    });
    return () => socket.off('stream:new_producer');
  }, []);

  const handleJoinAndStream = async () => {
    try {
      setStatus('מתחבר...');
      const data = await emitPromise('stream:join', { streamId, role: 'PLAYER' });
      await MediasoupManager.initDevice(data.rtpCapabilities);

      if (data.currentProducers) {
        for (const p of data.currentProducers) {
          await handleConsume(p.producerId, p.role);
        }
      }

      // const stream = await mediaDevices.getUserMedia({
      //   video: true, audio: true
      // });
      const stream = null; // Mock stream for testing
      setLocalStream(stream);

      // const sendTransport = await MediasoupManager.createTransport(socket, 'send', streamId);
      // await sendTransport.produce({ track: stream.getVideoTracks()[0] });
      setStatus('משדר וצופה! 🟢');
    } catch (err) {
      setStatus('שגיאה: ' + err.message);
    }
  };

  const handleConsume = async (producerId, role) => {
    const recvTransport = await MediasoupManager.createTransport(socket, 'recv', streamId);
    const consumeData = await emitPromise('stream:consume', {
      transportId: recvTransport.id,
      producerId,
      rtpCapabilities: MediasoupManager.getRtpCapabilities(),
      streamId
    });

    const consumer = await recvTransport.consume(consumeData);
    const stream = new MediaStream([consumer.track]);
    setRemoteStreams(prev => [...prev, { id: consumer.id, stream, role }]);
    await emitPromise('stream:resume', { consumerId: consumer.id, streamId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      
      <Text style={styles.label}>אני (שחקן):</Text>
      <View style={styles.localVideoBox}>
        {/* {localStream && <RTCView streamURL={localStream.toURL()} style={styles.video} objectFit="cover" />} */}
        <Text style={{ color: '#fff', textAlign: 'center', paddingTop: 50 }}>WebRTC Disabled</Text>
      </View>

      <Text style={styles.label}>שידור מהמארח:</Text>
      <ScrollView horizontal style={styles.remoteList}>
        {remoteStreams.map(item => (
          <View key={item.id} style={styles.remoteVideoBox}>
            {/* <RTCView streamURL={item.stream.toURL()} style={styles.video} objectFit="cover" /> */}
            <Text style={{ color: '#fff', textAlign: 'center', paddingTop: 50 }}>WebRTC Disabled</Text>
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
  remoteVideoBox: { width: 280, height: 180, backgroundColor: '#000', marginRight: 10 },
  video: { width: '100%', height: '100%' },
  remoteList: { marginTop: 10 },
  roleTag: { position: 'absolute', bottom: 5, left: 5, color: '#fff', backgroundColor: 'red', padding: 2 }
});

export default function Page() { return <PlayerTestScreen />; }