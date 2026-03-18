import  { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
// import { RTCView } from 'react-native-webrtc';
import { socket, emitPromise } from '../services/socket.service';
import { MediasoupManager } from '../services/MediasoupManager';

export default function BroadcastScreen() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null); // למנחה השני
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState('מחובר למערכת');

  // --- פונקציות לוגיקה קטנות ---

  const initMedia = async () => {
    try {
      setStatus('מבקש גישה למצלמה...');
      // const stream = await MediasoupManager.getLocalStream();
      const stream = null; // Mock stream for testing
      setLocalStream(stream);
      return stream;
    } catch (e) { setStatus('שגיאת מצלמה'); throw e; }
  };

  const startBroadcast = async () => {
    try {
      const stream = await initMedia();
      setStatus('מתחבר לשרת המדיה...');

      // 1. אתחול מול ה-Backend
      const { streamId } = await emitPromise('stream:init_broadcast', { title: 'שידור מנחים' });
      const { rtpCapabilities } = await emitPromise('stream:create_room', { streamId });
      
      // 2. אתחול Mediasoup
      // await MediasoupManager.initDevice(rtpCapabilities);
      // const transport = await MediasoupManager.createTransport(socket, 'send', streamId);

      // 3. הפקת וידאו (שים לב ל-role: PRESENTER כדי שלא יוקלט!)
      // await transport.produce({ 
      //   track: stream.getVideoTracks()[0], 
      //   appData: { role: 'MODERATOR' } 
      // });

      setIsLive(true);
      setStatus('שידור חי (לא מוקלט) - WebRTC Disabled');
    } catch (err) {
      console.error(err);
      setStatus('שגיאה בחיבור');
    }
  };

  // --- רכיבי תצוגה (UI) ---

  const VideoSlot = ({ stream, label, isRemote }) => (
    <View style={[styles.videoBox, isRemote && styles.remoteBox]}>
      {stream ? (
        // <RTCView 
        //   streamURL={stream.toURL()} 
        //   style={styles.rtc} 
        //   objectFit="cover" 
        //   mirror={!isRemote} 
        // />
        <Text style={styles.placeholderText}>WebRTC Disabled</Text>
      ) : (
        <Text style={styles.placeholderText}>{label}</Text>
      )}
      <View style={styles.badge}><Text style={styles.badgeText}>{label}</Text></View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      <View style={styles.splitGrid}>
        <VideoSlot stream={localStream} label="את/ה (מנחה 1)" />
        <VideoSlot stream={remoteStream} label="מנחה 2 (ממתין...)" isRemote />
      </View>

      <View style={styles.controls}>
        {!isLive ? (
          <TouchableOpacity style={styles.btnStart} onPress={startBroadcast}>
            <Text style={styles.btnText}>התחל שידור מנחים</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnStop} onPress={() => {/* לוגיקת עצירה */}}>
            <Text style={styles.btnText}>עצור שידור</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  statusText: { color: '#00ff00', fontWeight: 'bold' },
  splitGrid: { flex: 1, flexDirection: 'column' }, // אחד מעל השני (מתאים לנייד)
  videoBox: { flex: 1, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderColor: '#000' },
  remoteBox: { backgroundColor: '#181818' },
  rtc: { width: '100%', height: '100%' },
  placeholderText: { color: '#444' },
  badge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 12 },
  controls: { padding: 20, backgroundColor: '#1a1a1a' },
  btnStart: { backgroundColor: '#ff4757', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnStop: { backgroundColor: '#2f3542', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});