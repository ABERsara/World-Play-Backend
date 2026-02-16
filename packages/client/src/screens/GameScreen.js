import React from 'react';
import { View, Text, StyleSheet } from 'react-native'; // תיקון חוסר ב-View, Text
import { useSelector } from 'react-redux'; // תיקון useSelector is not defined
import PropTypes from 'prop-types'; // תיקון props validation

// אם GameComponent לא בשימוש, אפשר למחוק את השורה שלו או להשתמש בו
const GameScreen = ({ gameId }) => {
  const walletBalance = useSelector((state) => state.wallet.walletBalance);
  const score = useSelector((state) => state.wallet.scoresByGame[gameId] || 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game ID: {gameId}</Text>
      <Text style={styles.balance}>Balance: {walletBalance}</Text>
      <Text style={styles.score}>Score: {score}</Text>
    </View>
  );
};

// תיקון לשגיאת props validation
GameScreen.propTypes = {
  gameId: PropTypes.string.isRequired,
};

// תיקון לשגיאת styles is not defined
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  balance: { fontSize: 16 },
  score: { fontSize: 16 },
});

export default GameScreen;
