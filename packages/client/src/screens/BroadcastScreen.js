import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView } from 'react-native';
import { RTCView, mediaDevices } from 'react-native-webrtc';
import { socket } from '../services/socket.service';
import { mediasoupClient } from '../services/MediasoupClient';

export default function BroadcastScreen() {
  const [localStream, setLocalStream] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState('Ready');

  // 1. אתחול ראשוני: חיבור לסוקט וקבלת גישה למצלמה
  useEffect(() => {
    // התחברות לשרת
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setStatus('Connected to Server');
    });

    startCamera();

    return () => {
      // ניקוי ביציאה
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      socket.disconnect();
    };
  }, []);

  // 2. פונקציה להפעלת המצלמה המקומית
  const startCamera = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 640,
          height: 480,
          frameRate: 30,
          facingMode: 'user', // מצלמה קדמית
        },
      });
      setLocalStream(stream);
      setStatus('Camera Ready');
    } catch (error) {
      console.error('Error accessing camera:', error);
      setStatus('Camera Error: ' + error.message);
    }
  };

  // 3. לוגיקת השידור (החלק המעניין!)
  const startBroadcast = async () => {
    if (!localStream) return;
    setStatus('Starting Stream...');

    const gameId = 'game-' + Math.floor(Math.random() * 1000); // מזהה משחק זמני

    try {
      // א. בקשת פתיחת חדר מהשרת כדי לקבל את ה-RTP Capabilities
      socket.emit('stream:create_room', { gameId }, async (response) => {
        if (response.error) throw new Error(response.error);

        console.log('1. Room created, received capabilities');
        
        // ב. טעינת ה-Device של mediasoup
        const device = await mediasoupClient.loadDevice(response.rtpCapabilities);

        // ג. יצירת Transport בשרת
        socket.emit('stream:create_transport', { gameId }, async (transportParams) => {
           if (transportParams.error) throw new Error(transportParams.error);
           
           console.log('2. Transport created on server');

           // ד. יצירת Transport בצד הלקוח וחיבור אירועים
           const sendTransport = await mediasoupClient.createSendTransport(transportParams, socket);

           // ה. התחלת הזרמת הוידאו!
           console.log('3. Producing video...');
           const producer = await mediasoupClient.produce(localStream);
           
           console.log('✅ We are LIVE! Producer ID:', producer.id);
           setIsLive(true);
           setStatus('🔴 LIVE ON AIR');
        });
      });

    } catch (error) {
      console.error('Broadcast failed:', error);
      setStatus('Error: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Broadcast Studio</Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      <View style={styles.cameraContainer}>
        {localStream ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.camera}
            objectFit="cover"
            mirror={true}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text>Loading Camera...</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {!isLive ? (
          <Button title="Start Live Stream" onPress={startBroadcast} color="#e74c3c" />
        ) : (
          <Button title="Stop Stream" onPress={() => console.log('Stop logic here')} color="#555" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  status: { marginTop: 5, color: '#666' },
  cameraContainer: { flex: 1, margin: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1, width: '100%', height: '100%' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ddd' },
  controls: { padding: 20 },
});