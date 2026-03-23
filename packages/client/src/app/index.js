import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import ShopScreen from '../screens/ShopScreen';
import GameScreen from '../screens/GameScreen';
// import InboxScreen from '../screens/InboxScreen';

export default function Page() {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('HOME');

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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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

        {/* כפתור האינבוקס החדש */}
        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: '#60a5fa' }]}
          onPress={() => setCurrentScreen('INBOX')}
        >
          <Text style={styles.btnText}>📩 דואר והתראות</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setUser(null)}
        >
          <Text style={styles.logoutText}>יציאה מהחשבון</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  welcome: {
    color: '#fff',
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: 'bold',
  },
  menuBtn: {
    backgroundColor: '#2ed573',
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 3, // צל לאנדרואיד
    shadowColor: '#000', // צל לאייפון
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  backHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#2f3542',
    borderBottomWidth: 1,
    borderColor: '#3e4452',
  },
  backBtn: {
    padding: 8,
  },
  backText: {
    color: '#ffa502',
    fontWeight: '800',
    fontSize: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 40,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ff4757',
    textDecorationLine: 'underline',
    fontSize: 14,
    fontWeight: '600',
  },
});
