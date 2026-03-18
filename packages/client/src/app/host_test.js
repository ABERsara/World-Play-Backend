import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, PermissionsAndroid, Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { RTCView, mediaDevices } from 'react-native-webrtc';
import { socket, emitPromise, emitMediaPromise } from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';
import { SOCKET_EVENTS } from '@worldplay/shared';

export default function HostTestScreen() {
  const [localStream, setLocalStream] = useState(null);
  const [localStatus, setLocalStatus] = useState('מוכן...');

  const startHosting = async () => {
    console.log("--- 1. Start Hosting Sequence ---");
    try {
      // שלב א: הרשאות
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        console.log("--- 2. Permissions Result: ---", granted);
      }

      // שלב ב: פתיחת מצלמה
      console.log("--- 3. Opening camera ---");
      const stream = await mediaDevices.getUserMedia({
      audio: true,
       video: { width: 640, height: 480, frameRate: 30 }
      });
      // const stream = null; // Mock stream for testing
      console.log("--- 4. Camera opened successfully ---");

      setLocalStream(stream);
      setLocalStatus('מצלמה פתוחה. יוצר משחק בשרת...');

      const response = await emitPromise(SOCKET_EVENTS.GAME.CREATE, { title: "My Live Stream" });
      if (response.error) throw new Error(response.error);

      const { streamId, gameId } = response;
      console.log("✅ Game & Stream created. Stream ID:", streamId);

      // שלב ד: שימוש בקבוע GAME.JOIN (שים לב ששינינו מ-join_room ל-game:join_room)
      socket.emit(SOCKET_EVENTS.GAME.JOIN, { gameId, role: 'HOST' });

      // שלב ה: אתחול Mediasoup
      setLocalStatus('מאתחל שידור מדיה...');

      // 1. שימוש בקבוע STREAM.CREATE_ROOM (זה האירוע שחיפשנו!)
      const roomData = await emitMediaPromise(SOCKET_EVENTS.STREAM.CREATE_ROOM, { streamId });
      console.log("✅ Room created. RTP Capabilities received:", roomData.rtpCapabilities);
      // 2. טעינת המכשיר (מניח ש-MediasoupManager משתמש פנימית ב-SOCKET_EVENTS או מקבל אותם)
      await MediasoupManager.initDevice(roomData.rtpCapabilities);

      // 3. יצירת טרנספורט שידור
      // טיפ: כדאי שגם בתוך MediasoupManager תעבור להשתמש ב-SOCKET_EVENTS.STREAM
      const transport = await MediasoupManager.createTransport(socket, 'send', streamId);
      console.log("✅ Send transport created. ID:", transport.id);
      // 4. שידור הרצועות
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      // const videoTrack = null;
      // const audioTrack = null;

      if (videoTrack) await transport.produce({ track: videoTrack });
      if (audioTrack) await transport.produce({ track: audioTrack });
      console.log("✅ Tracks produced. Video:", !!videoTrack, "Audio:", !!audioTrack);
      setLocalStatus('שידור חי פועל ומוקלט! 🚀');


    } catch (err) {
      console.log("--- CRITICAL ERROR ---", err.message);
      setLocalStatus('שגיאה: ' + err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{localStatus}</Text>
      <View style={styles.videoBox}>
         {localStream && <RTCView streamURL={localStream.toURL()} style={styles.video} objectFit="cover" />}  
        <Text style={{ color: '#fff', textAlign: 'center', paddingTop: 50 }}>WebRTC Disabled for Testing</Text>
      </View>
      <Button title="התחל שידור" onPress={startHosting} color="#ff4757" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  status: { color: '#fff', textAlign: 'center', marginBottom: 10 },
  videoBox: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#333' },
  video: { width: '100%', height: '100%' }
});