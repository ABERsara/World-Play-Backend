import React, { useState } from 'react';
import { View, Text, Button, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { authService } from '../services/auth.service';

const ShopScreen = ({ userId }) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const buyPackage = async (amount) => {
    setLoading(true);
    try {
      const serverIp = '10.0.2.2'; // IP לאמולטור אנדרואיד
      
      // קבלת הטוקן
      const token = await authService.getToken();
      
      if (!token) {
        Alert.alert('שגיאה', 'לא נמצא טוקן התחברות. אנא התחברי מחדש.');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`http://${serverIp}:8080/api/payments/create-sheet`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, amount }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      const { paymentIntent, ephemeralKey, customer, publishableKey } = data;

      // אתחול ה-Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "WorldPlay",
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: 'Test User',
        },
      });

      if (initError) {
        Alert.alert('שגיאה באתחול', initError.message);
        return;
      }

      // הצגת ה-Payment Sheet
      const { error: presentError } = await presentPaymentSheet();
      
      if (presentError) {
        Alert.alert('תשלום בוטל', presentError.message);
      } else {
        Alert.alert(
          'הצלחה! 🎉', 
          `התשלום עבר בהצלחה.\nהמטבעות יעודכנו בחשבונך תוך רגעים.`
        );
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'שגיאה בתשלום', 
        'וודאי שהשרת דולק ושהחיבור תקין.\n\n' + error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🪙 חנות מטבעות</Text>
      <Text style={styles.subtitle}>קנייה ראשונה? תקבלי פי 2 מטבעות!</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#ff4757" />
      ) : (
        <View style={styles.packageContainer}>
          <PackageButton 
            title="10 מטבעות" 
            price="₪10" 
            onPress={() => buyPackage(10)} 
          />
          <PackageButton 
            title="50 מטבעות" 
            price="₪50" 
            bonus="הכי פופולרי!" 
            onPress={() => buyPackage(50)} 
          />
          <PackageButton 
            title="100 מטבעות" 
            price="₪100" 
            bonus="ערך הכי טוב!" 
            onPress={() => buyPackage(100)} 
          />
        </View>
      )}
      
      <Text style={styles.testInfo}>
        🧪 מצב בדיקה: השתמשי בכרטיס{'\n'}
        4242 4242 4242 4242
      </Text>
    </View>
  );
};

// קומפוננט עזר לכפתור חבילה
const PackageButton = ({ title, price, bonus, onPress }) => (
  <View style={styles.packageCard}>
    {bonus && <Text style={styles.badge}>{bonus}</Text>}
    <Text style={styles.packageTitle}>{title}</Text>
    <Text style={styles.packagePrice}>{price}</Text>
    <Button title="קנייה" onPress={onPress} color="#ff4757" />
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: '#1a1a1a' 
  },
  title: { 
    fontSize: 28, 
    textAlign: 'center', 
    marginBottom: 10, 
    color: '#fff',
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ffa502',
    marginBottom: 30,
  },
  packageContainer: { 
    gap: 15,
    marginBottom: 30,
  },
  packageCard: {
    backgroundColor: '#2f3542',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#ffa502',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageTitle: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 5,
  },
  packagePrice: {
    fontSize: 24,
    color: '#ffa502',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  testInfo: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  }
});

export default ShopScreen;