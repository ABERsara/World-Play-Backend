import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView } from 'react-native';
import { socket, emitPromise } from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';

export default function BroadcastScreen() {
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('מוכן לשידור');
  const [isLive, setIsLive] = useState(false);
  const videoRef = useRef(null);
  const STREAM_ID = "67e97530-30a9-49d1-8261-dac5f9664157";

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // עצירת שידור מסודרת
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    socket.emit('stream:stop_broadcast', { streamId: STREAM_ID });
    setStream(null);
    setIsLive(false);
    setStatus('השידור הופסק');
    console.log('🔴 השידור הופסק והמצלמה כבויה');
  };

  const startStream = async () => {
    try {
      setStatus('מבקש גישה למצלמה...');
      const media = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });

      setStream(media);
      setStatus('יוצר חדר בשרת...');
      const roomData = await emitPromise('stream:create_room', { streamId: STREAM_ID });
      
      await MediasoupManager.initDevice(roomData.rtpCapabilities);
      
      setStatus('מקים טרנספורט...');
      const transport = await MediasoupManager.createTransport(socket, 'send', STREAM_ID);
      
      setStatus('מתחיל הזרמה...');
      await transport.produce({ track: media.getVideoTracks()[0] });
      await transport.produce({ track: media.getAudioTracks()[0] });

      setIsLive(true);
      setStatus('LIVE 🔴');
    } catch (err) {
      console.error('❌ שגיאה בשידור:', err);
      setStatus('שגיאה: ' + err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Broadcast Studio</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      <View style={styles.videoContainer}>
        {stream ? (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            style={styles.webVideo} 
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{color: '#666'}}>המצלמה כבויה</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {!isLive ? (
          <Button title="התחל שידור חי" onPress={startStream} color="#ff4757" />
        ) : (
          <Button title="הפסק שידור" onPress={stopStream} color="#2f3542" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { padding: 20, alignItems: 'center' },
  title: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  statusText: { color: '#ffa502', marginTop: 5 },
  videoContainer: { flex: 1, backgroundColor: '#000', margin: 10, borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  webVideo: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  placeholder: { alignItems: 'center' },
  footer: { padding: 20 }
});