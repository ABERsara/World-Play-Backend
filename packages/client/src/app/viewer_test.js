import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import Hls from 'hls.js';

export default function ViewerTestScreen() {
    const videoRef = useRef(null);
    const gameStream = useSelector(state => state.gameStream) || {};
    const { hlsUrl = null, status = 'IDLE' } = gameStream;
    const isPaused = (status === 'PAUSE');

    useEffect(() => {
        if (hlsUrl && videoRef.current) {
            if (Hls.isSupported()) {
                const hls = new Hls({ lowLatencyMode: true });
                hls.loadSource(hlsUrl);
                hls.attachMedia(videoRef.current);

                // טיפול בשגיאות טעינה (למשל אם הקובץ עוד לא נוצר)
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) console.warn("HLS Error:", data.type);
                });
            }
        }
    }, [hlsUrl]);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isPaused) {
            videoRef.current.pause();
        } else if (status === 'ACTIVE') {
            videoRef.current.play().catch(() => { });
        }
    }, [isPaused, status]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>בדיקת צופה (HLS Stream)</Text>
            <View style={styles.infoBox}>
                <Text style={{ color: isPaused ? 'red' : 'green' }}>סטטוס: {status}</Text>
                <Text style={{ color: '#aaa', fontSize: 10 }}>URL: {hlsUrl}</Text>
            </View>

            <View style={styles.videoBox}>
                <video ref={videoRef} style={styles.video} autoPlay playsInline />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a1a', padding: 20 },
    videoBox: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
    video: { width: '100%', height: '100%' },
    infoBox: { marginBottom: 20, padding: 10, backgroundColor: '#333', borderRadius: 5 }
});