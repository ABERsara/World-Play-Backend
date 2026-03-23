import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import PropTypes from 'prop-types';
import { emitPromise } from '../services/socket.service';

export default function BroadcastScreen() {
  const [localStream] = useState(null);
  const [remoteStream] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState('מחובר למערכת');

  const initMedia = async () => {
    try {
      setStatus('מבקש גישה למצלמה...');
      const stream = null;
      return stream;
    } catch (e) {
      setStatus('שגיאת מצלמה');
      throw e;
    }
  };

  const startBroadcast = async () => {
    try {
      await initMedia();
      setStatus('מתחבר לשרת המדיה...');

      const { streamId } = await emitPromise('stream:init_broadcast', {
        title: 'שידור מנחים',
      });
      await emitPromise('stream:create_room', { streamId });

      setIsLive(true);
      setStatus('שידור חי (לא מוקלט) - WebRTC Disabled');
    } catch (err) {
      console.error(err);
      setStatus('שגיאה בחיבור');
    }
  };

  const VideoSlot = ({ stream, label, isRemote }) => (
    <View style={[styles.videoBox, isRemote && styles.remoteBox]}>
      {stream ? (
        <Text style={styles.placeholderText}>WebRTC Disabled</Text>
      ) : (
        <Text style={styles.placeholderText}>{label}</Text>
      )}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    </View>
  );

  VideoSlot.propTypes = {
    stream: PropTypes.object,
    label: PropTypes.string.isRequired,
    isRemote: PropTypes.bool,
  };

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
          <TouchableOpacity style={styles.btnStop} onPress={() => {}}>
            <Text style={styles.btnText}>עצור שידור</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  statusText: { color: '#00ff00', fontWeight: 'bold' },
  splitGrid: { flex: 1, flexDirection: 'column' },
  videoBox: {
    flex: 1,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: '#000',
  },
  remoteBox: { backgroundColor: '#181818' },
  placeholderText: { color: '#444' },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 4,
  },
  badgeText: { color: '#fff', fontSize: 12 },
  controls: { padding: 20, backgroundColor: '#1a1a1a' },
  btnStart: {
    backgroundColor: '#ff4757',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnStop: {
    backgroundColor: '#2f3542',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
