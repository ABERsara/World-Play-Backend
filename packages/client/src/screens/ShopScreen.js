import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';
import { useStripe } from '@stripe/stripe-react-native';
import { authService } from '../services/auth.service';
import { useSelector, useDispatch } from 'react-redux';
import { updateBalances } from '../store/slices/walletSlice';
const ShopScreen = ({ userId, onLogout }) => {
  const dispatch = useDispatch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);

  // שליפת היתרה מה-Redux הגלובלי (מתעדכן אוטומטית מהסוקט)
  const coins = useSelector((state) => state.wallet.walletBalance || 0);
  const scores = useSelector((state) => state.wallet.scoresByGame || {});
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        setFetchingBalance(true);
        const token = await authService.getToken();

        if (!token) {
          onLogout();
          return;
        }

        // 1. שליפה ראשונית מה-API (כדי לסנכרן את הסטור בעליה)
        const response = await fetch('http://10.0.2.2:8080/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401 || response.status === 403) {
          await authService.logout();
          onLogout();
          return;
        }
        const data = await response.json();
        console.log('📥 Data from server:', data); // תוסיפי את הלוג הזה כדי לראות מה חוזר ב-Console

        dispatch(
          updateBalances({
            walletCoins: data.walletCoins, // זה יעדכן ל-1000
            scoresByGame: data.scoresByGame || {},
          })
        );
      } catch (e) {
        console.error('❌ Initialization error:', e);
      } finally {
        setFetchingBalance(false);
      }
    };

    initializeScreen();
  }, [userId]); // רק בטעינה הראשונה
  const buyPackage = async (amount) => {
    setLoading(true);
    try {
      const token = await authService.getToken();

      console.log('💳 Initiating purchase:', { userId, coins: amount });

      const response = await fetch(
        'http://10.0.2.2:8080/api/payments/create-sheet',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, coins: amount }),
        }
      );

      const data = await response.json();
      console.log('💳 Payment sheet data received');

      const { paymentIntent, ephemeralKey, customer } = data;

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'WorldPlay',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: false,
        appearance: { colors: { primary: '#ffa502' } },
      });

      if (initError) throw initError;

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        console.log('❌ Payment cancelled or failed:', paymentError.message);
      } else {
        console.log('✅ Payment completed successfully');
        Alert.alert('בהצלחה!', 'התשלום בוצע. היתרה תתעדכן תוך שניות...');
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      Alert.alert('שגיאה', error.message);
    } finally {
      setLoading(false);
    }
  };
  const triggerTestAnswer = async () => {
    try {
      const token = await authService.getToken();

      // שימוש ב-fetch ישיר כדי למנוע את השגיאה Property 'api' doesn't exist
      const response = await fetch(
        'http://10.0.2.2:8080/api/user-answers/submit',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionId: '28a886da-89d0-4bfa-b020-ff7e66c3aac7',
            selectedOptionId: 'f3e5d96c-1be2-4bdd-9de1-cbdf6e44a663',
            wager: 10,
          }),
        }
      );

      // בדיקה אם השרת החזיר HTML (שגיאת 404 או 500) במקום JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          'השרת החזיר שגיאה (HTML). ודאי שהנתיב /api/user-answers/submit קיים ב-Routes'
        );
      }

      const data = await response.json();
      console.log('✅ השרת עיבד את התשובה:', data);
    } catch (err) {
      Alert.alert('שגיאה בבדיקה', err.message);
    }
  };
  if (fetchingBalance) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffa502" />
        <Text style={styles.loadingText}>טוען נתונים...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>🚪 יציאה</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🪙 חנות מטבעות</Text>
      <Text style={styles.balance}>יתרה: {coins} מטבעות</Text>
      <Text style={styles.balance}>
        ניקוד פעיל: {Object.values(scores)[0] || 0} נקודות
      </Text>
      {/* --- כפתור בדיקה זמני לסנכרון לייב --- */}
      <TouchableOpacity style={styles.testButton} onPress={triggerTestAnswer}>
        <Text style={styles.testButtonText}>
          🎯 בדיקת סנכרון (הימור 10 מטבעות)
        </Text>
      </TouchableOpacity>
      {/* ------------------------------------- */}

      <View style={styles.packageContainer}>
        {/* חבילה 1 */}
        <TouchableOpacity
          style={styles.packageCard}
          onPress={() => buyPackage(10)}
          disabled={loading}
        >
          <Text style={styles.packageTitle}>10 מטבעות</Text>
          <Text style={styles.packagePrice}>₪10</Text>
        </TouchableOpacity>

        {/* חבילה 2 - הכי פופולרית */}
        <TouchableOpacity
          style={[styles.packageCard, styles.popular]}
          onPress={() => buyPackage(50)}
          disabled={loading}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>הכי פופולרי!</Text>
          </View>
          <Text style={styles.packageTitle}>50 מטבעות</Text>
          <Text style={styles.packagePrice}>₪50</Text>
          <Text style={styles.bonusText}>(בונוס פי 2 לקנייה ראשונה!)</Text>
        </TouchableOpacity>

        {/* חבילה 3 */}
        <TouchableOpacity
          style={styles.packageCard}
          onPress={() => buyPackage(100)}
          disabled={loading}
        >
          <Text style={styles.packageTitle}>100 מטבעות</Text>
          <Text style={styles.packagePrice}>₪100</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff4757" />
          <Text style={styles.loadingText}>מעבד תשלום...</Text>
        </View>
      )}
    </View>
  );
};

ShopScreen.propTypes = {
  userId: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  balance: {
    fontSize: 24,
    color: '#ffa502',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: 'bold',
  },
  logoutBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#ff4757',
    padding: 10,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  packageContainer: { gap: 15 },
  packageCard: {
    backgroundColor: '#2f3542',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
  },
  popular: { borderColor: '#ffa502', borderWidth: 2 },
  badge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#ffa502',
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  packageTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  packagePrice: { fontSize: 22, color: '#ffa502', fontWeight: 'bold' },
  bonusText: { fontSize: 12, color: '#2ed573', marginTop: 5 },
  loadingOverlay: { marginTop: 20, alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 10 },
  testButton: {
    backgroundColor: '#535c68',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffa502',
    borderStyle: 'dashed',
  },
  testButtonText: {
    color: '#ffa502',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default ShopScreen;
