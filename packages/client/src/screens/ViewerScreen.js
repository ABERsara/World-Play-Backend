import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Button, TextInput } from 'react-native';
import { socket, connectSocket, emitPromise } from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';

export default function ViewerScreen() {
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [status, setStatus] = useState('ממתין להזנת מזהה שידור...');
  const [streamIdInput, setStreamIdInput] = useState(""); 
  const videoRef = useRef(null);

  // 1. האזנה לאירועי סוקט (פעם אחת בלבד בטעינה)
  useEffect(() => {
    const activeSocket = socket || connectSocket();

    activeSocket.on('stream:new_producer', ({ producerId }) => {
      console.log("New producer detected:", producerId);
      consume(producerId, streamIdInput);
    });

    activeSocket.on('stream:closed', () => {
      setRemoteStream(null);
      setStatus('השידור הופסק על ידי המארח');
    });

    return () => {
      activeSocket.off('stream:new_producer');
      activeSocket.off('stream:closed');
    };
  }, [streamIdInput]);

  // 2. פונקציית הצטרפות (מופעלת בלחיצת כפתור)
  const handleJoinPress = async () => {
    if (!streamIdInput) return alert("אנא הזיני ID");
    
    try {
      setStatus('מצטרף לשידור...');
      setHasInteracted(true);

      const data = await emitPromise('stream:join', { streamId: streamIdInput });
      await MediasoupManager.initDevice(data.rtpCapabilities);
      
      if (data.currentProducerId) {
        await consume(data.currentProducerId, streamIdInput);
      } else {
        setStatus('מחובר. ממתין שהמארח יתחיל להזרים...');
      }
    } catch (err) {
      console.error("Join error:", err);
      setStatus('שגיאה: ' + err.message);
    }
  };

  // 3. פונקציית צריכת וידאו (Consume)
  const consume = async (producerId, targetId) => {
    try {
      const caps = MediasoupManager.getRtpCapabilities();
      const transport = await MediasoupManager.createTransport(socket, 'recv', targetId);
      
      const consumeData = await emitPromise('stream:consume', {
        transportId: transport.id,
        producerId,
        rtpCapabilities: caps,
        streamId: targetId
      });

      const consumer = await transport.consume(consumeData);
      const newStream = new MediaStream([consumer.track]);
      
      setRemoteStream(newStream);
      setStatus('שידור חי 🔴');
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      await emitPromise('stream:resume', { consumerId: consumer.id, streamId: targetId });
    } catch (err) {
      console.error('❌ Consume error:', err);
      setStatus('שגיאה בקבלת הוידאו');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>צופה בשידור</Text>
      
      {!hasInteracted ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="הזיני Stream ID כאן"
            placeholderTextColor="#888"
            value={streamIdInput}
            onChangeText={setStreamIdInput}
          />
          <Button title="התחברי לשידור" onPress={handleJoinPress} color="#ff4757" />
        </View>
      ) : (
        <View style={styles.videoBox}>
          {remoteStream ? (
            <video ref={videoRef} autoPlay playsInline style={styles.video} />
          ) : (
            <Text style={styles.statusText}>{status}</Text>
          )}
        </View>
      )}
      
      <Text style={styles.statusBadge}>{status}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { color: '#fff', fontSize: 22, marginBottom: 30, fontWeight: 'bold' },
  inputContainer: { width: '100%', alignItems: 'center' },
  input: { backgroundColor: '#fff', width: '90%', padding: 15, borderRadius: 8, marginBottom: 20, textAlign: 'center' },
  videoBox: { width: '100%', aspectRatio: 16/9, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  video: { width: '100%', height: '100%', objectFit: 'contain' },
  statusText: { color: '#aaa' },
  statusBadge: { color: '#ffa502', marginTop: 20 }
});