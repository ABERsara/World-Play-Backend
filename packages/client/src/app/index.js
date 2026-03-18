import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import ShopScreen from '../screens/ShopScreen';
import GameScreen from './game_screen';
import { useDispatch } from 'react-redux';
import { initGameSession } from '../store/slices/gameStreamSlice'; 
import HostTestScreen from './host_test'; 

export default function Page() {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('HOME');
  const dispatch = useDispatch(); 
  if (!user) {
    return <LoginScreen onLoginSuccess={(data) => setUser(data)} />;
  }

  if (currentScreen === 'SHOP') {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setCurrentScreen('HOME')}
        >
          <Text style={styles.backText}>⬅️ חזרה לבית</Text>
        </TouchableOpacity>

        <TouchableOpacity 
  style={[styles.menuBtn, {backgroundColor: 'red'}]} 
  onPress={() => setCurrentScreen('HOST_TEST')}
>
  <Text style={styles.btnText}>🧪 טסט מארח</Text>
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
        <GameScreen />
      </View>
    );
  }
if (currentScreen === 'HOST_TEST') {
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => setCurrentScreen('HOME')}
      >
        <Text style={styles.backText}>⬅️ חזרה לבית</Text>
      </TouchableOpacity>
      <HostTestScreen />
    </View>
  );
}
  
  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>שלום, {user.username} 👋</Text>

      {/* כפתור כניסה למשחק כשחקן */}
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => {
           {/*1. מעדכנים את הרידקס בפרטי המשחק*/}
          dispatch(initGameSession({ 
            gameId: "8b796ee0-179d-4328-a184-2be8205eaf63", 
            role: 'PLAYER' 
          }));
         {/* 2. עוברים למסך המשחק} */}
          setCurrentScreen('GAME');
        }}
      >
        <Text style={styles.btnText}>🎮 כניסה למשחק פעיל (PLAYER)</Text>
      </TouchableOpacity>

      {/* כפתור טסט מארח - הוספתי כאן לנוחות במקום בתוך SHOP */}
      <TouchableOpacity 
        style={[styles.menuBtn, {backgroundColor: '#ff4757'}]} 
        onPress={() => {
          dispatch(initGameSession({ role: 'HOST' }));
          setCurrentScreen('HOST_TEST');
        }}
      >
        <Text style={styles.btnText}>🧪 טסט מארח (HOST)</Text>
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
