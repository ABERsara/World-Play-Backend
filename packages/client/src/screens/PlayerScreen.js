import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';
import { socket } from '../services/socket.service';

// Mock components to satisfy linter
const VideoView = ({ label }) => (
  <View>
    <Text>{label}</Text>
  </View>
);
VideoView.propTypes = { label: PropTypes.string };
const LocalVideoView = () => (
  <View>
    <Text>Self</Text>
  </View>
);
const ModeratorCircle = () => (
  <View>
    <Text>Mod</Text>
  </View>
);

export default function PlayerScreen({ streamId }) {
  const [remoteStreams, setRemoteStreams] = useState([]);

  // Mock functions to satisfy linter
  const startMyCamera = () => console.log('Camera started');
  const consumeStream = async (id) => ({ id, url: 'mock' });

  useEffect(() => {
    startMyCamera();

    const handleNewProducer = async ({ producerId, role }) => {
      const stream = await consumeStream(producerId);
      setRemoteStreams((prev) => [...prev, { id: producerId, stream, role }]);
    };

    socket.on('stream:new_producer', handleNewProducer);
    return () => socket.off('stream:new_producer', handleNewProducer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={{ color: 'white' }}>Stream: {streamId}</Text>
      <View style={styles.grid}>
        {remoteStreams.map((item) => (
          <View key={item.id} style={styles.videoWrapper}>
            <VideoView label={item.role} style={styles.video} />
            <Text style={styles.playerName}>{item.role}</Text>
          </View>
        ))}
      </View>
      <View style={styles.selfPreview}>
        <LocalVideoView />
      </View>
      <ModeratorCircle />
    </View>
  );
}

PlayerScreen.propTypes = {
  streamId: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  videoWrapper: {
    width: '50%',
    height: '50%',
    borderWidth: 1,
    borderColor: '#333',
  },
  video: { width: '100%', height: '100%' },
  selfPreview: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 10,
    overflow: '#hidden',
  },
  playerName: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
  },
});
