// src/components/LiveHeader.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

const LiveHeader = () => {
  // שליפת הנתונים מה-Store
  const { walletBalance, pointsInGame } = useSelector((state) => state.wallet);

  return (
    <View style={styles.container}>
      <Text style={styles.coinText}>🪙 Coins: {walletBalance}</Text>
      <Text style={styles.scoreText}>🏆 Game Score: {pointsInGame}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  coinText: { color: '#FFD700', fontWeight: 'bold' },
  scoreText: { color: '#00FF00', fontWeight: 'bold' },
});

export default LiveHeader;
