import React, { useEffect, useState } from 'react';
// הוספנו את Platform כאן למטה ברשימת הייבוא
import { View, Text, Button, StyleSheet, SafeAreaView, Platform } from 'react-native';

// שימוש במצלמת הדפדפן לעבודה ב-Web
const mediaDevices = typeof window !== 'undefined' ? window.navigator.mediaDevices : null;

import { socket } from '../services/socket.service';
import { mediasoupClient } from '../services/MediasoupClient';

export default function BroadcastScreen() {
  const [localStream, setLocalStream] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
  // וודא שהסוקט קיים לפני הוספת מאזינים
  if (socket) {
    socket.on('connect', () => setStatus('Connected to Server'));
    socket.on('connect_error', (err) => {
        console.error("Socket Error:", err);
        setStatus('Server Connection Failed');
    });
  }

  startCamera();

  return () => {
    if (socket) {
      socket.off('connect');
      socket.off('connect_error');
    }
  };
}, []);

  const startCamera = async () => {
    try {
      if (mediaDevices && mediaDevices.getUserMedia) {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: { width: 1280, height: 720 }
        });
        setLocalStream(stream);
        setStatus('Camera Ready');
      } else {
        setStatus('Preview Mode (No Camera)');
      }
    } catch (error) {
      console.error('Camera Error:', error);
      setStatus('Camera Access Denied');
    }
  };

  const startBroadcast = async () => {
    try {
      setStatus('Step 1: Getting Router Capabilities...');
      
      socket.emit('getRouterRtpCapabilities', async (rtpCapabilities) => {
        try {
          await mediasoupClient.loadDevice(rtpCapabilities);
          setStatus('Step 2: Creating Transport...');

          socket.emit('createTransport', async (transportParams) => {
            try {
              const transport = await mediasoupClient.createSendTransport(transportParams, socket);
              setStatus('Step 3: Starting Stream...');

              if (localStream) {
                await mediasoupClient.produce(localStream);
                setIsLive(true);
                setStatus('LIVE 🔴');
              } else {
                setStatus('Error: No Camera Stream');
              }
            } catch (err) {
              console.error('Transport Error:', err);
              setStatus('Transport Failed');
            }
          });
        } catch (err) {
          console.error('Device Load Error:', err);
          setStatus('Device Loading Failed');
        }
      });
    } catch (error) {
      console.error('Broadcast Start Error:', error);
      setStatus('Broadcast Failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Broadcast Studio</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.dot, { backgroundColor: isLive ? '#ff4757' : '#ffa502' }]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <View style={styles.cameraContainer}>
        {localStream ? (
          // בדיקה האם אנחנו בדפדפן
          Platform.OS === 'web' ? (
            <video
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', borderRadius: 15, objectFit: 'cover' }}
              ref={(video) => {
                if (video && localStream) video.srcObject = localStream;
              }}
            />
          ) : (
            <Text style={{color: 'white'}}>Mobile Video Placeholder</Text>
          )
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Camera Preview</Text>
            <Text style={styles.placeholderSubText}>Ready to start the stream</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {!isLive ? (
          <Button title="START LIVE" onPress={startBroadcast} color="#ff4757" />
        ) : (
          <Button title="STOP STREAM" onPress={() => setIsLive(false)} color="#2f3542" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 20, alignItems: 'center', backgroundColor: '#1a1a1a' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#ccc', fontSize: 12, fontWeight: '600' },
  cameraContainer: { flex: 1, margin: 15, borderRadius: 15, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 18, fontWeight: '500' },
  placeholderSubText: { color: '#666', fontSize: 12, marginTop: 8 },
  footer: { padding: 20, backgroundColor: '#1a1a1a' }
});