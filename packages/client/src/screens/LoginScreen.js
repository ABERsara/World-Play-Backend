import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import PropTypes from 'prop-types';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authService } from '../services/auth.service';
import { connectSocket } from '../services/socket.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

// const API_URL = 'http://10.0.2.2:8080'; // אנדרואיד אמולטור — שני לIP שלך אם על מכשיר אמיתי
const API_URL = 'https://hunter-obsessed-shield.ngrok-free.dev';

const LoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    setLoading(true);
    try {
      const data = await authService.login(email, password);
      await connectSocket();
      onLoginSuccess({
        id: data.user.id,
        email: data.user.email,
        username: data.user.username || data.user.email,
      });
    } catch (error) {
      Alert.alert('שגיאת התחברות', error.message || 'פרטים שגויים');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const redirectUrl = Linking.createURL('auth-success');
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_URL}/auth/google?redirect_uri=${encodeURIComponent(redirectUrl)}`,
        redirectUrl
      );
      if (result.type === 'success' && result.url) {
        const token = result.url.split('token=')[1];
        if (token) await handleGoogleToken(token);
        else {
          Alert.alert('שגיאה', 'לא התקבל טוקן מגוגל');
          setGoogleLoading(false);
        }
      } else {
        setGoogleLoading(false);
      }
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את דף גוגל');
      setGoogleLoading(false);
    }
  };

  const handleGoogleToken = async (token) => {
    try {
      // שמירת token כמו בlogin רגיל
      await AsyncStorage.setItem('userToken', token);

      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await response.json();
      await connectSocket();
      onLoginSuccess({
        id: user.id,
        email: user.email,
        username: user.username,
        token,
      });
    } catch {
      Alert.alert('שגיאה', 'התחברות עם Google נכשלה');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 WorldPlay</Text>
      <Text style={styles.subtitle}>התחברות</Text>

      <TextInput
        style={styles.input}
        placeholder="אימייל"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="סיסמה"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.loginBtn, loading && styles.btnDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginText}>כניסה</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>או</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
        onPress={handleGoogleLogin}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.googleText}>🔵 התחברות עם Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

LoginScreen.propTypes = {
  onLoginSuccess: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 36,
    textAlign: 'center',
    color: '#ffa502',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    textAlign: 'center',
    color: '#fff',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#2f3542',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    textAlign: 'right',
  },
  loginBtn: {
    backgroundColor: '#ffa502',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.6 },
  loginText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#444',
  },
  dividerText: {
    color: '#888',
    marginHorizontal: 10,
    fontSize: 14,
  },
  googleBtn: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
});

export default LoginScreen;
