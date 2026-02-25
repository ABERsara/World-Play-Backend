import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types'; // הוספת הייבוא

const LiveHeader = ({ currentGameId }) => {
  const { walletBalance, scoresByGame } = useSelector((state) => state.wallet);

  const points = currentGameId
    ? scoresByGame[currentGameId] || 0
    : Object.values(scoresByGame || {})[0] || 0;

  return (
    <View style={styles.container}>
      <Text style={styles.coinText}>
        🪙 Coins: {Number(walletBalance || 0).toFixed(2)}
      </Text>

      <Text style={styles.scoreText}>
        🏆 Score: {Number(points).toFixed(2)}
      </Text>
    </View>
  );
};

// תיקון השגיאה: הגדרת ה-Props
LiveHeader.propTypes = {
  currentGameId: PropTypes.string,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  coinText: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 },
  scoreText: { color: '#00FF00', fontWeight: 'bold', fontSize: 16 },
});

export default LiveHeader;
