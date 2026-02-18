import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import ShopScreen from '../screens/ShopScreen';
import GameScreen from '../screens/GameScreen';

export default function Page() {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('HOME'); // ניהול המסך הנוכחי

  // 1. הגנה: אם לא מחובר, תמיד מציגים לוגין
  if (!user) {
    return <LoginScreen onLoginSuccess={(data) => setUser(data)} />;
  }

  // 2. ניווט למסך חנות/יתרות
  if (currentScreen === 'SHOP') {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setCurrentScreen('HOME')}
        >
          <Text style={styles.backText}>⬅️ חזרה לבית</Text>
        </TouchableOpacity>
        <ShopScreen userId={user.id} onLogout={() => setUser(null)} />
      </View>
    );
  }

  // 3. ניווט למסך משחק
  if (currentScreen === 'GAME') {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setCurrentScreen('HOME')}
        >
          <Text style={styles.backText}>⬅️ חזרה לבית</Text>
        </TouchableOpacity>
        <GameScreen gameId="8b796ee0-179d-4328-a184-2be8205eaf63" />
      </View>
    );
  }

  // 4. מסך הבית (תפריט ראשי)
  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>שלום, {user.username} 👋</Text>

      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => setCurrentScreen('GAME')}
      >
        <Text style={styles.btnText}>🎮 כניסה למשחק פעיל</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuBtn, { backgroundColor: '#ffa502' }]}
        onPress={() => setCurrentScreen('SHOP')}
      >
        <Text style={styles.btnText}>🪙 חנות ויתרות</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => setUser(null)}>
        <Text style={styles.logoutText}>יציאה מהחשבון</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    padding: 20,
  },
  welcome: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: 'bold',
  },
  menuBtn: {
    backgroundColor: '#2ed573',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: {
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#2f3542',
    alignItems: 'center',
  },
  backText: { color: '#ffa502', fontWeight: 'bold' },
  logoutBtn: { marginTop: 50, alignItems: 'center' },
  logoutText: { color: '#ff4757', textDecorationLine: 'underline' },
});
