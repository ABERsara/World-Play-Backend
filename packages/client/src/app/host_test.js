import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { RTCView, mediaDevices } from 'react-native-webrtc';
import {
  socket,
  emitPromise,
  emitMediaPromise,
} from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';
import { SOCKET_EVENTS } from '@worldplay/shared';

export default function HostTestScreen() {
  const [localStream, setLocalStream] = useState(null);
  const [localStatus, setLocalStatus] = useState('מוכן...');
  const [currentGameId, setCurrentGameId] = useState(null);

  const startHosting = async () => {
    try {
      // Request permissions on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        if (
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] !==
            PermissionsAndroid.RESULTS.GRANTED ||
          granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !==
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          throw new Error('Camera and microphone permissions are required');
        }
      }

      setLocalStatus('פותח מצלמה...');
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { width: 640, height: 480, frameRate: 30 },
      });
      setLocalStream(stream);

      const response = await emitPromise(SOCKET_EVENTS.GAME.CREATE, {
        title: 'Live Stream',
      });
      if (response.error) throw new Error(response.error);

      // שימוש ב-Destructuring נכון בלי להכריז פעמיים
      const { streamId, gameId } = response;
      setCurrentGameId(gameId);

      const roomData = await emitMediaPromise(
        SOCKET_EVENTS.STREAM.CREATE_ROOM,
        { streamId }
      );
      await MediasoupManager.initDevice(roomData.rtpCapabilities);

      const transport = await MediasoupManager.createTransport(
        socket,
        'send',
        streamId
      );

      if (stream.getVideoTracks()[0])
        await transport.produce({ track: stream.getVideoTracks()[0] });
      if (stream.getAudioTracks()[0])
        await transport.produce({ track: stream.getAudioTracks()[0] });

      // עדכון סטטוס ל-ACTIVE
      await emitPromise(SOCKET_EVENTS.GAME.UPDATE_STATUS, {
        gameId,
        status: 'ACTIVE',
      });
      setLocalStatus('שידור חי פועל! 🚀');
    } catch (err) {
      setLocalStatus('שגיאה: ' + err.message);
    }
  };
  const endStream = async () => {
    setLocalStatus('מסיים שידור ומנקה...');

    // עצירה מקומית
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // שליחה לשרת - זה מה שיפעיל את כל שרשרת הניקוי ב-DB ובמדיה
    await emitPromise(SOCKET_EVENTS.GAME.UPDATE_STATUS, {
      gameId: currentGameId,
      status: 'FINISHED',
    });
    setCurrentGameId(null);
    setLocalStatus('השידור הסתיים');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{localStatus}</Text>
      <View style={styles.videoBox}>
        {localStream ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.video}
            objectFit="cover"
          />
        ) : (
          <View style={styles.centered}>
            <Text style={{ color: '#fff' }}>מצלמה כבויה</Text>
          </View>
        )}
      </View>
      {!localStream ? (
        <Button title="התחל שידור" onPress={startHosting} color="#ff4757" />
      ) : (
        <Button title="עצור שידור" onPress={endStream} color="#2f3542" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  status: { color: '#fff', textAlign: 'center', marginBottom: 10 },
  videoBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#333',
    justifyContent: 'center',
  },
  video: { width: '100%', height: '100%' },
  centered: { alignItems: 'center' },
});
