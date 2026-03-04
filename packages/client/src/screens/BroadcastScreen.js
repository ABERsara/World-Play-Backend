import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView } from 'react-native';
import { socket, emitPromise } from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';

export default function BroadcastScreen() {
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('מוכן לשידור');
  const [isLive, setIsLive] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState(null); // הוספנו סטייט ל-ID מהשרת
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // עצירת שידור מתוקנת
  const stopStream = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // משתמשים ב-ID שקיבלנו מהשרת בזמן היצירה
      if (currentStreamId) {
        socket.emit('stream:stop_broadcast', { streamId: currentStreamId });
      }

      setStream(null);
      setIsLive(false);
      setCurrentStreamId(null);
      setStatus('השידור הופסק');
      console.log('🔴 השידור הופסק בהצלחה');
    } catch (err) {
      console.error('שגיאה בעצירת השידור:', err);
    }
  };

  const startStream = async () => {
    try {
      setStatus('מאתחל משחק...');

      // 1. עדכון שרת האפליקציה שהמשחק מתחיל (ACTIVE)
      // זה יעדכן את ה-DB שהסטטוס הוא ACTIVE
      const gameData = await emitPromise('stream:init_broadcast', {
        title: 'משחק חדש',
      });
      const streamIdFromServer = gameData.streamId;
      setCurrentStreamId(streamIdFromServer);

      // 2. גישה למצלמה
      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(media);

      // 3. התחברות לשרת המדיה (Socket המדיה)
      const roomData = await emitPromise('stream:create_room', {
        streamId: streamIdFromServer,
      });
      await MediasoupManager.initDevice(roomData.rtpCapabilities);

      // 4. יצירת טרנספורט שליחה
      const transport = await MediasoupManager.createTransport(
        socket,
        'send',
        streamIdFromServer
      );

      // 5. שליחת הוידאו - כאן קורה הקסם!
      // ברגע שזה נשלח, ה-Media Server יזהה שאתה HOST/PLAYER ויפעיל FFmpeg
      await transport.produce({
        track: media.getVideoTracks()[0],
        appData: { role: 'HOST' },
      });
      await transport.produce({
        track: media.getAudioTracks()[0],
        appData: { role: 'HOST' },
      });

      setIsLive(true);
      setStatus('LIVE 🔴 - הצופים רואים אותך בפיד');
    } catch (err) {
      console.error('Stream Error:', err);
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
            <Text style={{ color: '#666' }}>המצלמה כבויה - לחצי על התחל</Text>
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
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  placeholder: { alignItems: 'center' },
  footer: { padding: 20 },
});
