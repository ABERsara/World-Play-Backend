import React, { useEffect, useState } from 'react';
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
import { socket, connectSocket } from '../services/socket.service';

const ShopScreen = ({ userId, onLogout }) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState(0);
  const [fetchingBalance, setFetchingBalance] = useState(true);

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        setFetchingBalance(true);
        const token = await authService.getToken();

        if (!token) {
          onLogout();
          return;
        }

        // 1. שליפת היתרה
        const response = await fetch('http://10.0.2.2:8080/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401 || response.status === 403) {
          await authService.logout();
          onLogout();
          return;
        }

        const data = await response.json();
        console.log('📊 Profile data:', data);

        if (data.walletCoins !== undefined) {
          setCoins(data.walletCoins);
          console.log('💰 Current balance:', data.walletCoins);
        }

        // 2. חיבור Socket רק אחרי שקיבלנו את היתרה
        console.log('🔌 Connecting socket for userId:', userId);
        const connectedSocket = await connectSocket();

        if (connectedSocket) {
          console.log('✅ Socket connected successfully');

          // 3. הצטרפות לחדר האישי של המשתמש
          connectedSocket.emit('user:join', { userId });

          // 4. האזנה לעדכוני ארנק
          connectedSocket.on('wallet:updated', (updateData) => {
            console.log('💰 Wallet update received:', updateData);
            if (updateData.newBalance !== undefined) {
              setCoins(updateData.newBalance);
              Alert.alert(
                'הטעינה הצליחה! 🎉',
                `היתרה החדשה: ${updateData.newBalance} מטבעות`
              );
            }
          });
        } else {
          console.warn('⚠️ Socket connection failed');
        }
      } catch (e) {
        console.error('❌ Initialization error:', e);
      } finally {
        setFetchingBalance(false);
      }
    };

    initializeScreen();

    // ניקוי בעת יציאה מהמסך
    return () => {
      if (socket) {
        socket.off('wallet:updated');
        console.log('🔌 Socket listeners cleaned up');
      }
    };
  }, [userId, onLogout]);

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
});

export default ShopScreen;
