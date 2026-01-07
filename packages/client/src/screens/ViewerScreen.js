import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Button } from 'react-native';
import { socket, connectSocket, emitPromise } from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';

export default function ViewerScreen() {
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('מתחבר...');
  const [hasInteracted, setHasInteracted] = useState(false);
  const videoRef = useRef(null);
  const STREAM_ID = "67e97530-30a9-49d1-8261-dac5f9664157";

  const startPlayback = async () => {
    setHasInteracted(true);
    setTimeout(async () => {
      if (videoRef.current && remoteStream) {
        videoRef.current.srcObject = remoteStream;
        try { await videoRef.current.play(); } catch (e) { console.log("Playback error:", e); }
      }
    }, 200);
  };

  useEffect(() => {
    if (videoRef.current && remoteStream && hasInteracted) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, hasInteracted]);

  useEffect(() => {
    const activeSocket = socket || connectSocket();

    const initViewer = async () => {
      try {
        setStatus('מצטרף לחדר...');
        const data = await emitPromise('stream:join', { streamId: STREAM_ID });
        await MediasoupManager.initDevice(data.rtpCapabilities);
        
        if (data.producers && data.producers.length > 0) {
          data.producers.forEach(pId => consume(pId));
        } else {
          setStatus('ממתין לשידור...');
        }
      } catch (err) {
        setStatus('שגיאה בחיבור');
      }
    };

    // האזנה לשידור חדש
    activeSocket.off('stream:new_producer');
    activeSocket.on('stream:new_producer', ({ producerId }) => {
      consume(producerId);
    });

    // האזנה לסגירת שידור
    activeSocket.off('stream:closed');
    activeSocket.on('stream:closed', () => {
      console.log('🛑 המארח סגר את השידור');
      setRemoteStream(null);
      setStatus('השידור הופסק');
    });

    initViewer();

    return () => {
      activeSocket.off('stream:new_producer');
      activeSocket.off('stream:closed');
    };
  }, []);

  const consume = async (producerId) => {
    try {
      const caps = MediasoupManager.getRtpCapabilities();
      const transport = await MediasoupManager.createTransport(socket, 'recv', STREAM_ID);
      const consumeData = await emitPromise('stream:consume', {
        transportId: transport.id, producerId, rtpCapabilities: caps, streamId: STREAM_ID
      });

      const consumer = await transport.consume(consumeData);
      setRemoteStream(prev => {
        const stream = prev || new MediaStream();
        if (!stream.getTracks().find(t => t.id === consumer.track.id)) {
          stream.addTrack(consumer.track);
        }
        return new MediaStream(stream.getTracks());
      });
      setStatus('שידור חי 🔴');
      await emitPromise('stream:resume', { consumerId: consumer.id, streamId: STREAM_ID });
    } catch (err) {
      console.error('❌ Consume error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>צופה בשידור</Text>
      <View style={styles.videoBox}>
        {!hasInteracted ? (
          <View style={styles.interactContainer}>
            <Text style={styles.statusText}>השידור זמין</Text>
            <Button title="לחצי לצפייה בשידור" onPress={startPlayback} />
          </View>
        ) : (
          <>
            {remoteStream ? (
              <video ref={videoRef} autoPlay playsInline style={styles.video} />
            ) : (
              <Text style={styles.statusText}>{status}</Text>
            )}
          </>
        )}
      </View>
      <Text style={styles.statusBadge}>{status}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 22, marginBottom: 20, fontWeight: 'bold' },
  videoBox: { width: '90%', aspectRatio: 16/9, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  video: { width: '100%', height: '100%', objectFit: 'contain' },
  statusText: { color: '#aaa', marginBottom: 10 },
  statusBadge: { color: '#ffa502', marginTop: 15 },
  interactContainer: { alignItems: 'center' }
});