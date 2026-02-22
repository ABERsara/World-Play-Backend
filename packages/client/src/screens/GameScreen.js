import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { socket } from '../services/socket.service';
import { updateBalances } from '../store/slices/walletSlice';
import { authService } from '../services/auth.service';

const GameScreen = ({ gameId }) => {
  const dispatch = useDispatch();

  const walletBalance = useSelector((state) => state.wallet.walletBalance || 0);
  const score = useSelector((state) => {
    return state.wallet.scoresByGame?.[gameId] || 0;
  });
  // נתונים "קשיחים" לצורך הבדיקה
  const mockQuestion = {
    id: '28a886da-89d0-4bfa-b020-ff7e66c3aac7',
    text: 'מי ינצח במשחק?',
    options: [
      { id: 'f3e5d96c-1be2-4bdd-9de1-cbdf6e44a663', label: "קבוצה א'" },
      { id: 'option_2_id_fake', label: "קבוצה ב'" },
    ],
  };

  // משיכת נתונים ראשונית כדי שהמסך לא יהיה על 0 בכניסה
  useEffect(() => {
    // 1. משיכת נתונים ראשונית (HTTP)
    const fetchCurrentStats = async () => {
      try {
        const token = await authService.getToken();
        const response = await fetch('http://10.0.2.2:8080/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        dispatch(
          updateBalances({
            walletCoins: data.walletCoins || data.walletBalance,
            scoresByGame: data.scoresByGame || {},
          })
        );
      } catch (e) {
        console.error('❌ Failed to fetch stats:', e);
      }
    };

    fetchCurrentStats();

    // 2. הגדרת מאזין לעדכונים חיים (Socket)
    const handleBalanceUpdate = (data) => {
      if (data.gameId === gameId) {
        dispatch(
          updateBalances({
            walletCoins: data.walletCoins,
            scoresByGame: { [data.gameId]: data.pointsInGame },
          })
        );
      }
    };

    socket.on('balance_update', handleBalanceUpdate);

    // 3. ניקוי (Cleanup) - קריטי למניעת באגים!
    return () => {
      socket.off('balance_update', handleBalanceUpdate);
    };
  }, [gameId, dispatch]);

  const handleSelectOption = (optionId) => {
    socket.emit('place_bet', {
      gameId: gameId,
      questionId: '28a886da-89d0-4bfa-b020-ff7e66c3aac7',
      optionId: optionId,
      amount: 10,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{mockQuestion.text}</Text>

      <View style={styles.optionsContainer}>
        {mockQuestion.options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={styles.optionBtn}
            onPress={() => handleSelectOption(opt.id)}
          >
            <Text style={styles.optionLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statLabel}>
          הארנק שלי: <Text style={styles.orange}>{walletBalance}</Text>
        </Text>
        <Text style={styles.statLabel}>
          ניקוד בזירה: <Text style={styles.green}>{score}</Text>
        </Text>
      </View>
    </View>
  );
};

GameScreen.propTypes = { gameId: PropTypes.string.isRequired };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  optionsContainer: { gap: 15, marginBottom: 40 },
  optionBtn: {
    backgroundColor: '#2f3542',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  optionLabel: { color: '#fff', fontSize: 18, fontWeight: '500' },
  statsCard: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statLabel: { color: '#aaa', fontSize: 14 },
  orange: { color: '#ffa502', fontWeight: 'bold' },
  green: { color: '#2ed573', fontWeight: 'bold' },
});

export default GameScreen;
