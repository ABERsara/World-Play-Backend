import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { socket } from '../services/socket.service';
import { updateBalances } from '../store/slices/walletSlice';
import { authService } from '../services/auth.service';

const GameScreen = ({ gameId }) => {
  const dispatch = useDispatch();

  const walletBalance = useSelector((state) => state.wallet.walletBalance || 0);
  const score = useSelector(
    (state) => state.wallet.scoresByGame?.[gameId] || 0
  );

  const isModerator = true;

  const mockQuestion = {
    id: 'c5d5074e-395b-404a-8c7d-0eef8c24f694',
    text: 'מי ינצח בדו-קרב השני?',
    options: [
      { id: '1910647f-5d69-4187-a376-5ba35c1da772', label: "שחקן א' (משה)" },
      { id: 'f29de355-526d-4d48-b3e5-3f61ed632aa6', label: "שחקן ב' (דוד)" },
    ],
  };

  useEffect(() => {
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

    const handleBalanceUpdate = (data) => {
      console.log('🚀 [Socket] Live Sync Update:', data);
      dispatch(updateBalances(data));
    };

    socket.on('balance_update', handleBalanceUpdate);

    return () => {
      socket.off('balance_update', handleBalanceUpdate);
    };
  }, [gameId, dispatch]);

  const handleSelectOption = async (optionId) => {
    try {
      const token = await authService.getToken();
      const response = await fetch(
        'http://10.0.2.2:8080/api/user-answers/submit',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionId: mockQuestion.id,
            selectedOptionId: optionId,
            wager: 10,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        Alert.alert('שגיאה', data.error || 'ההימור נכשל');
      }
    } catch (err) {
      console.error('Submit error:', err); // תיקון: שימוש במשתנה
      Alert.alert('שגיאה', 'בעיית תקשורת');
    }
  };

  const handleResolve = async (optionId) => {
    try {
      const token = await authService.getToken();
      const response = await fetch(
        `http://10.0.2.2:8080/api/questions/${mockQuestion.id}/resolve`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ optionId }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert('הצלחה', 'הקופה חולקה והיתרה עודכנה!');
      } else {
        Alert.alert('שגיאה', data.error || 'אין הרשאה');
      }
    } catch (err) {
      console.error('Resolve error:', err); // תיקון: שימוש במשתנה
      Alert.alert('שגיאה', 'תקלה בחיבור לשרת');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{mockQuestion.text}</Text>

      <View style={styles.optionsContainer}>
        {mockQuestion.options.map((opt) => (
          <View key={opt.id} style={styles.optionWrapper}>
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => handleSelectOption(opt.id)}
            >
              <Text style={styles.optionLabel}>{opt.label}</Text>
            </TouchableOpacity>

            {isModerator && (
              <TouchableOpacity
                style={styles.resolveBtn}
                onPress={() => handleResolve(opt.id)}
              >
                <Text style={styles.resolveText}>🏆 קבע כזוכה</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>הארנק שלי</Text>
          <Text style={styles.orange}>{Number(walletBalance).toFixed(2)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>ניקוד בזירה</Text>
          <Text style={styles.green}>{Number(score).toFixed(2)}</Text>
        </View>
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
  optionsContainer: { gap: 20, marginBottom: 40 },
  optionWrapper: { gap: 8 },
  optionBtn: {
    backgroundColor: '#2f3542',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  optionLabel: { color: '#fff', fontSize: 18, fontWeight: '500' },
  resolveBtn: {
    backgroundColor: '#ffa502',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  statsCard: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderColor: '#333',
  },
  statItem: { alignItems: 'center' },
  statLabel: { color: '#aaa', fontSize: 12, marginBottom: 5 },
  orange: { color: '#ffa502', fontWeight: 'bold', fontSize: 22 },
  green: { color: '#2ed573', fontWeight: 'bold', fontSize: 22 },
});

export default GameScreen;
